import httpStatus from "http-status";
import { prismaClient } from "@/db/db";
import { AppError } from "@/utils/helpers/appError";
import { dayKey } from "@/utils/helpers/date";
import { calculateBestStreakDays, calculateCurrentStreakDays } from "@/utils/helpers/streak";
import { computeBestFocusWindow } from "@/utils/helpers/focusWindow";
import { ASSUMED_MINUTES_PER_BLOCKED_ATTEMPT } from "@/utils/constants/analytics";
import { IProgressDto, IStreakCalendarCell } from "@/routes/progress/utils/types";

const STREAK_CALENDAR_DAYS = 30;
const WEEK_BUCKET_COUNT = 8;
const COLD_START_ACCOUNT_AGE_DAYS = 30;
const WEEKDAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

type ISession = { startedAt: Date; endedAt: Date | null; elapsedSeconds: number | null; blockedAttemptCount: number };

export class ProgressHelpers {
  public static get = async (userId: string): Promise<IProgressDto> => {
    const user = await prismaClient.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new AppError("User not found", httpStatus.NOT_FOUND);
    }

    const missions = await prismaClient.mission.findMany({
      where: { userId },
      include: { focusSessions: true },
    });

    const allSessions = missions.flatMap((mission) => mission.focusSessions);
    const completedMissionDates = missions
      .map((mission) => mission.completedAt)
      .filter((date): date is Date => date !== null);
    const hitDayKeys = new Set(completedMissionDates.map(dayKey));

    const accountCreatedAt = user.createdAt;
    const accountAgeDays = Math.floor((Date.now() - accountCreatedAt.getTime()) / (1000 * 60 * 60 * 24));

    const weekBuckets = ProgressHelpers.buildWeekBuckets(allSessions, accountCreatedAt);
    const currentAvgFocusMinutes =
      weekBuckets.length === 0 ? null : weekBuckets[weekBuckets.length - 1].avgFocusMinutes;

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const distractionAttemptsThisWeek = allSessions
      .filter((session) => session.startedAt >= sevenDaysAgo)
      .reduce((sum, session) => sum + session.blockedAttemptCount, 0);

    return {
      currentStreakDays: calculateCurrentStreakDays(hitDayKeys),
      bestStreakDays: calculateBestStreakDays(hitDayKeys, accountCreatedAt),
      streakCalendar: ProgressHelpers.buildStreakCalendar(hitDayKeys, accountCreatedAt),
      timeReclaimedThisWeekMinutes: weekBuckets.length === 0 ? 0 : weekBuckets[weekBuckets.length - 1].reclaimedMinutes,
      timeReclaimedByWeekMinutes: weekBuckets.map((week) => week.reclaimedMinutes),
      focusDurationByWeekMinutes: weekBuckets.map((week) => week.avgFocusMinutes),
      currentAvgFocusMinutes,
      bestFocusWindow: computeBestFocusWindow(allSessions),
      toughestDay: ProgressHelpers.findToughestDay(hitDayKeys, accountCreatedAt),
      distractionAttemptsThisWeek,
      isColdStart: accountAgeDays < COLD_START_ACCOUNT_AGE_DAYS,
    };
  };

  private static buildStreakCalendar = (hitDayKeys: Set<string>, accountCreatedAt: Date): IStreakCalendarCell[] => {
    const todayKey = dayKey(new Date());
    const accountCreatedKey = dayKey(accountCreatedAt);
    const cells: IStreakCalendarCell[] = [];

    for (let offset = STREAK_CALENDAR_DAYS - 1; offset >= 0; offset -= 1) {
      const cursor = new Date();
      cursor.setDate(cursor.getDate() - offset);
      const key = dayKey(cursor);

      cells.push({
        date: key,
        status:
          key < accountCreatedKey ? "no-history" : key === todayKey ? "today" : hitDayKeys.has(key) ? "hit" : "miss",
      });
    }

    return cells;
  };

  // Rolling 7-day buckets, oldest -> newest. A week entirely before account
  // creation is omitted, not shown as a zero-value bar (Cold Start rule) —
  // a week that overlaps real account history is included even if the
  // computed value is a genuine zero.
  private static buildWeekBuckets = (
    sessions: ISession[],
    accountCreatedAt: Date,
  ): { reclaimedMinutes: number; avgFocusMinutes: number }[] => {
    const accountCreatedKey = dayKey(accountCreatedAt);
    const buckets: { reclaimedMinutes: number; avgFocusMinutes: number }[] = [];

    for (let weekIndex = WEEK_BUCKET_COUNT - 1; weekIndex >= 0; weekIndex -= 1) {
      const weekEnd = new Date();
      weekEnd.setDate(weekEnd.getDate() - weekIndex * 7);
      const weekStart = new Date(weekEnd);
      weekStart.setDate(weekStart.getDate() - 6);

      if (dayKey(weekEnd) < accountCreatedKey) {
        continue;
      }

      const sessionsInWeek = sessions.filter((session) => session.startedAt >= weekStart && session.startedAt <= weekEnd);
      const reclaimedMinutes = sessionsInWeek.reduce(
        (sum, session) => sum + session.blockedAttemptCount * ASSUMED_MINUTES_PER_BLOCKED_ATTEMPT,
        0,
      );
      const completedSessions = sessionsInWeek.filter((session) => session.endedAt !== null);
      const avgFocusMinutes =
        completedSessions.length === 0
          ? 0
          : Math.round(
              completedSessions.reduce((sum, session) => sum + (session.elapsedSeconds ?? 0), 0) /
                completedSessions.length /
                60,
            );

      buckets.push({ reclaimedMinutes, avgFocusMinutes });
    }

    return buckets;
  };

  // "Toughest" = lowest zero-backlog rate for that weekday, all-time since
  // account creation (see DD-002 Open Item: no window was specified in the
  // spec). Today is excluded — it isn't finished yet and shouldn't count
  // against its weekday. Needs at least a week of elapsed history.
  private static findToughestDay = (hitDayKeys: Set<string>, accountCreatedAt: Date): string | null => {
    const totalsByWeekday = Array.from({ length: 7 }, () => ({ hits: 0, total: 0 }));
    const cursor = new Date(accountCreatedAt);
    const yesterdayKey = dayKey(new Date(Date.now() - 24 * 60 * 60 * 1000));
    let elapsedDays = 0;

    while (dayKey(cursor) <= yesterdayKey) {
      const weekday = cursor.getDay();
      totalsByWeekday[weekday].total += 1;
      if (hitDayKeys.has(dayKey(cursor))) {
        totalsByWeekday[weekday].hits += 1;
      }
      elapsedDays += 1;
      cursor.setDate(cursor.getDate() + 1);
    }

    if (elapsedDays < 7) {
      return null;
    }

    let toughestIndex: number | null = null;
    let lowestRate = Infinity;
    totalsByWeekday.forEach(({ hits, total }, index) => {
      if (total === 0) {
        return;
      }
      const rate = hits / total;
      if (rate < lowestRate) {
        lowestRate = rate;
        toughestIndex = index;
      }
    });

    return toughestIndex === null ? null : WEEKDAY_NAMES[toughestIndex];
  };
}
