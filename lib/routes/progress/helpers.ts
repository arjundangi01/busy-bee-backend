import httpStatus from "http-status";
import { MissionStatus, SessionEndReason, TaskStatus } from "@prisma/client";
import { prismaClient } from "@/db/db";
import { AppError } from "@/utils/helpers/appError";
import { dayKey } from "@/utils/helpers/date";
import { calculateBestStreakDays, calculateCurrentStreakDays } from "@/utils/helpers/streak";
import { computeBestFocusWindow } from "@/utils/helpers/focusWindow";
import { ASSUMED_MINUTES_PER_BLOCKED_ATTEMPT } from "@/utils/constants/analytics";
import {
  IDeviceActivityDto,
  IProgressDto,
  IScreenTimeDto,
  IStreakCalendarCell,
  ITopDistraction,
} from "@/routes/progress/utils/types";

const STREAK_CALENDAR_DAYS = 30;
const WEEK_BUCKET_COUNT = 8;
const COLD_START_ACCOUNT_AGE_DAYS = 30;
const WEEKDAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

type ISession = {
  id: string;
  missionId: string;
  startedAt: Date;
  endedAt: Date | null;
  elapsedSeconds: number | null;
  blockedAttemptCount: number;
  sessionEndReason: SessionEndReason | null;
};

type ITask = { id: string; status: TaskStatus; startedAt: Date | null; estimatedMinutes: number | null };

type IMissionWithRelations = {
  id: string;
  status: MissionStatus;
  createdAt: Date;
  completedAt: Date | null;
  focusSessions: ISession[];
  tasks: ITask[];
};

export class ProgressHelpers {
  public static get = async (userId: string): Promise<IProgressDto> => {
    const user = await prismaClient.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new AppError("User not found", httpStatus.NOT_FOUND);
    }

    const missions: IMissionWithRelations[] = await prismaClient.mission.findMany({
      where: { userId },
      include: { focusSessions: { orderBy: { startedAt: "asc" } }, tasks: true },
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

    const sessionsEndedEarlyThisWeek = allSessions.filter(
      (session) => session.startedAt >= sevenDaysAgo && session.sessionEndReason === SessionEndReason.EARLY_EXIT,
    ).length;

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
      topDistraction: await ProgressHelpers.computeTopDistraction(userId, sevenDaysAgo),
      longestFocusMinutes: ProgressHelpers.computeLongestFocusMinutes(allSessions),
      sessionsEndedEarlyThisWeek,
      tasksPastTheirTime: ProgressHelpers.computeTasksPastTheirTime(missions),
      timeToStartMinutes: ProgressHelpers.computeTimeToStartMinutes(missions),
      bounceBackRatePercent: ProgressHelpers.computeBounceBackRatePercent(allSessions),
      missionCompletionRatePercent: ProgressHelpers.computeMissionCompletionRatePercent(missions),
      stepCompletionRatePercent: ProgressHelpers.computeStepCompletionRatePercent(missions),
      screenTime: await ProgressHelpers.computeScreenTime(userId, dayKey(new Date())),
      deviceActivity: await ProgressHelpers.computeDeviceActivity(userId, dayKey(new Date())),
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

  // "This week" matches the same rolling 7-day window the old bare
  // distraction-attempts count used — top offending app, not just a count.
  // Resolved against the user's own BlockedApp list so the row shows a real
  // app name, not a raw package id; falls back to the package id itself in
  // the edge case where the app was later removed from the blocklist.
  private static computeTopDistraction = async (
    userId: string,
    sevenDaysAgo: Date,
  ): Promise<ITopDistraction | null> => {
    const events = await prismaClient.blockedAttemptEvent.findMany({
      where: { occurredAt: { gte: sevenDaysAgo }, focusSession: { mission: { userId } } },
    });
    if (events.length === 0) {
      return null;
    }

    const countByPackage = new Map<string, number>();
    events.forEach((event) => {
      countByPackage.set(event.packageName, (countByPackage.get(event.packageName) ?? 0) + 1);
    });

    let topPackageName: string | null = null;
    let topCount = 0;
    countByPackage.forEach((count, packageName) => {
      if (count > topCount) {
        topCount = count;
        topPackageName = packageName;
      }
    });
    if (!topPackageName) {
      return null;
    }

    const blockedApp = await prismaClient.blockedApp.findUnique({
      where: { userId_packageName: { userId, packageName: topPackageName } },
    });

    return { appName: blockedApp?.appName ?? topPackageName, count: topCount };
  };

  private static computeLongestFocusMinutes = (sessions: ISession[]): number | null => {
    const elapsedValues = sessions
      .map((session) => session.elapsedSeconds)
      .filter((value): value is number => value !== null);
    if (elapsedValues.length === 0) {
      return null;
    }
    return Math.round(Math.max(...elapsedValues) / 60);
  };

  // A task counts as "past its time" only once it has a real startedAt (set
  // when it became the mission's active task) and an estimatedMinutes
  // budget — a task that hasn't started yet, or has no time estimate, can't
  // be measured against a budget it doesn't have.
  private static computeTasksPastTheirTime = (missions: IMissionWithRelations[]): number => {
    const now = Date.now();
    return missions.reduce((total, mission) => {
      const overdueCount = mission.tasks.filter((task) => {
        if (task.status === TaskStatus.DONE || task.startedAt === null || task.estimatedMinutes === null) {
          return false;
        }
        const elapsedMinutes = (now - task.startedAt.getTime()) / (60 * 1000);
        return elapsedMinutes > task.estimatedMinutes;
      }).length;
      return total + overdueCount;
    }, 0);
  };

  // Avg delay between a mission being created and the user actually
  // starting work on it (first tied FocusSession), across every mission
  // that's ever had one — null (not zero) if no mission has started yet.
  private static computeTimeToStartMinutes = (missions: IMissionWithRelations[]): number | null => {
    const delaysMinutes = missions
      .filter((mission) => mission.focusSessions.length > 0)
      .map((mission) => (mission.focusSessions[0].startedAt.getTime() - mission.createdAt.getTime()) / (60 * 1000));

    if (delaysMinutes.length === 0) {
      return null;
    }
    return Math.round(delaysMinutes.reduce((sum, minutes) => sum + minutes, 0) / delaysMinutes.length);
  };

  // % of EARLY_EXIT sessions followed by a new session (any mission) the
  // same calendar day — the "Fresh Start Effect" signal from the Follow-
  // Through card's research grounding. Null (not 0%) with no EARLY_EXIT
  // sessions at all, since a rate needs a real denominator.
  private static computeBounceBackRatePercent = (sessions: ISession[]): number | null => {
    const earlyExitSessions = sessions.filter((session) => session.sessionEndReason === SessionEndReason.EARLY_EXIT);
    if (earlyExitSessions.length === 0) {
      return null;
    }

    const bouncedBackCount = earlyExitSessions.filter((earlyExitSession) => {
      const referenceTime = earlyExitSession.endedAt ?? earlyExitSession.startedAt;
      return sessions.some(
        (candidate) =>
          candidate.id !== earlyExitSession.id &&
          candidate.startedAt > referenceTime &&
          dayKey(candidate.startedAt) === dayKey(referenceTime),
      );
    }).length;

    return Math.round((bouncedBackCount / earlyExitSessions.length) * 100);
  };

  private static computeMissionCompletionRatePercent = (missions: IMissionWithRelations[]): number | null => {
    if (missions.length === 0) {
      return null;
    }
    const completedCount = missions.filter((mission) => mission.status === MissionStatus.COMPLETED).length;
    return Math.round((completedCount / missions.length) * 100);
  };

  // Scoped to missions the user has actually started a session for —
  // excludes never-started backlog, which would otherwise drag this rate
  // down with tasks nobody has begun working on yet.
  private static computeStepCompletionRatePercent = (missions: IMissionWithRelations[]): number | null => {
    const startedMissionsTasks = missions
      .filter((mission) => mission.focusSessions.length > 0)
      .flatMap((mission) => mission.tasks);

    if (startedMissionsTasks.length === 0) {
      return null;
    }
    const doneCount = startedMissionsTasks.filter((task) => task.status === TaskStatus.DONE).length;
    return Math.round((doneCount / startedMissionsTasks.length) * 100);
  };

  // Past N calendar days, NOT including today — the comparison baseline a
  // "vs your average" delta measures today against, matching the existing
  // day-key convention (dayKey/startOfUtcDay) used throughout this file.
  private static recentDayKeys = (daysBack: number): string[] => {
    const keys: string[] = [];
    for (let offset = 1; offset <= daysBack; offset += 1) {
      const cursor = new Date();
      cursor.setDate(cursor.getDate() - offset);
      keys.push(dayKey(cursor));
    }
    return keys;
  };

  // Null means no on-device usage-stats aggregate exists for today yet (the
  // "not enough data" state) — distinct from the OS permission not being
  // granted, which is a purely client-side check the mobile app makes
  // directly against the native module.
  private static computeScreenTime = async (userId: string, todayKey: string): Promise<IScreenTimeDto> => {
    const [appUsageToday, blockedApps] = await Promise.all([
      prismaClient.appUsageDaily.findMany({
        where: { userId, date: todayKey },
        orderBy: { foregroundSeconds: "desc" },
      }),
      prismaClient.blockedApp.findMany({ where: { userId }, select: { packageName: true } }),
    ]);

    if (appUsageToday.length === 0) {
      return null;
    }

    const blockedPackageNames = new Set(blockedApps.map((app) => app.packageName));
    const apps = appUsageToday.map((row) => ({
      packageName: row.packageName,
      appName: row.appName,
      foregroundSeconds: row.foregroundSeconds,
      isBlocked: blockedPackageNames.has(row.packageName),
    }));

    return {
      totalForegroundSeconds: apps.reduce((sum, app) => sum + app.foregroundSeconds, 0),
      apps,
    };
  };

  private static computeDeviceActivity = async (userId: string, todayKey: string): Promise<IDeviceActivityDto> => {
    const today = await prismaClient.deviceActivityDaily.findUnique({
      where: { userId_date: { userId, date: todayKey } },
    });
    if (!today) {
      return null;
    }

    const priorDates = ProgressHelpers.recentDayKeys(7);

    const [priorActivity, blockedApps, todayAppUsage, priorAppUsage] = await Promise.all([
      prismaClient.deviceActivityDaily.findMany({ where: { userId, date: { in: priorDates } } }),
      prismaClient.blockedApp.findMany({ where: { userId }, select: { packageName: true } }),
      prismaClient.appUsageDaily.findMany({ where: { userId, date: todayKey } }),
      prismaClient.appUsageDaily.findMany({ where: { userId, date: { in: priorDates } } }),
    ]);

    const blockedPackageNames = new Set(blockedApps.map((app) => app.packageName));
    const distractionsSecondsFor = (rows: { packageName: string; foregroundSeconds: number }[]): number =>
      rows
        .filter((row) => blockedPackageNames.has(row.packageName))
        .reduce((sum, row) => sum + row.foregroundSeconds, 0);

    // Only average over prior days the usage-stats module actually ran on
    // (has a real DeviceActivityDaily row) — a day with no row at all (e.g.
    // before the permission was granted) isn't a real zero and would
    // wrongly deflate the average if zero-filled.
    const validPriorDates = new Set(priorActivity.map((row) => row.date));
    const distractionsByPriorDate = new Map<string, number>();
    validPriorDates.forEach((date) => distractionsByPriorDate.set(date, 0));
    priorAppUsage.forEach((row) => {
      if (!validPriorDates.has(row.date) || !blockedPackageNames.has(row.packageName)) return;
      distractionsByPriorDate.set(row.date, (distractionsByPriorDate.get(row.date) ?? 0) + row.foregroundSeconds);
    });

    const avg = (values: number[]): number | null =>
      values.length === 0 ? null : Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);

    return {
      pickupCount: { value: today.pickupCount, avg7d: avg(priorActivity.map((row) => row.pickupCount)) },
      offlineSeconds: { value: today.offlineSeconds, avg7d: avg(priorActivity.map((row) => row.offlineSeconds)) },
      distractionsSeconds: {
        value: distractionsSecondsFor(todayAppUsage),
        avg7d: avg(Array.from(distractionsByPriorDate.values())),
      },
      firstPickupAt: today.firstPickupAt?.toISOString() ?? null,
      lastPickupAt: today.lastPickupAt?.toISOString() ?? null,
      priorFirstPickupAts: priorActivity
        .map((row) => row.firstPickupAt)
        .filter((date): date is Date => date !== null)
        .map((date) => date.toISOString()),
      priorLastPickupAts: priorActivity
        .map((row) => row.lastPickupAt)
        .filter((date): date is Date => date !== null)
        .map((date) => date.toISOString()),
    };
  };
}
