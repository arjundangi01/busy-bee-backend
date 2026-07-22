import httpStatus from "http-status";
import { TaskStatus } from "@prisma/client";
import { prismaClient } from "@/db/db";
import { AppError } from "@/utils/helpers/appError";
import { computeBestFocusWindow, formatHour } from "@/utils/helpers/focusWindow";
import { IDashboardDto, ITrendDay } from "@/routes/dashboard/utils/types";

const TREND_DAYS = 7;
const COLD_START_HISTORY_DAYS = 7;
// No per-blocked-app tracking exists yet (the blocking mechanism itself is a
// later delivery) — approximate reclaimed time from blocked-attempt counts
// using a fixed per-attempt estimate rather than fabricating precision we don't have.
const ASSUMED_MINUTES_PER_BLOCKED_ATTEMPT = 3;

const dayKey = (date: Date): string => date.toISOString().slice(0, 10);

export class DashboardHelpers {
  public static get = async (userId: string): Promise<IDashboardDto> => {
    const user = await prismaClient.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new AppError("User not found", httpStatus.NOT_FOUND);
    }

    const missions = await prismaClient.mission.findMany({
      where: { userId },
      include: { tasks: true, focusSessions: true },
    });

    const allTasks = missions.flatMap((mission) => mission.tasks);
    const allSessions = missions.flatMap((mission) => mission.focusSessions);
    const completedMissionDates = missions
      .map((mission) => mission.completedAt)
      .filter((date): date is Date => date !== null);

    const backlogCount = allTasks.filter((task) => task.status === TaskStatus.PENDING).length;
    const streakDays = DashboardHelpers.calculateStreakDays(completedMissionDates);
    const trend = DashboardHelpers.buildTrend(completedMissionDates);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentSessions = allSessions.filter((session) => session.startedAt >= sevenDaysAgo);
    const timeReclaimedMinutes = recentSessions.reduce(
      (sum, session) => sum + session.blockedAttemptCount * ASSUMED_MINUTES_PER_BLOCKED_ATTEMPT,
      0,
    );

    const todayKey = dayKey(new Date());
    const todaySessions = allSessions.filter((session) => dayKey(session.startedAt) === todayKey);
    const minutesFocusedToday = Math.round(
      todaySessions.reduce((sum, session) => sum + (session.elapsedSeconds ?? 0), 0) / 60,
    );

    const historyDayCount = new Set(allSessions.map((session) => dayKey(session.startedAt))).size;
    const isColdStart = historyDayCount < COLD_START_HISTORY_DAYS;

    return {
      name: user.name,
      streakDays,
      backlogCount,
      timeReclaimedMinutes,
      trend,
      today: {
        sessionsCompleted: todaySessions.filter((session) => session.endedAt !== null).length,
        minutesFocused: minutesFocusedToday,
        tasksWaiting: backlogCount,
      },
      patternSignal: isColdStart ? null : DashboardHelpers.buildPatternSignal(allSessions),
      isColdStart,
    };
  };

  private static calculateStreakDays = (completedMissionDates: Date[]): number => {
    if (completedMissionDates.length === 0) {
      return 0;
    }

    const dayKeys = new Set(completedMissionDates.map(dayKey));
    let streak = 0;
    const cursor = new Date();

    for (;;) {
      const key = dayKey(cursor);
      if (!dayKeys.has(key)) {
        break;
      }
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    }

    return streak;
  };

  private static buildTrend = (completedMissionDates: Date[]): ITrendDay[] => {
    const hitDays = new Set(completedMissionDates.map(dayKey));
    const todayKey = dayKey(new Date());
    const days: ITrendDay[] = [];

    for (let offset = TREND_DAYS - 1; offset >= 0; offset -= 1) {
      const cursor = new Date();
      cursor.setDate(cursor.getDate() - offset);
      const key = dayKey(cursor);
      days.push({
        date: key,
        status: key === todayKey ? "today" : hitDays.has(key) ? "hit" : "miss",
      });
    }

    return days;
  };

  private static buildPatternSignal = (
    sessions: { startedAt: Date; elapsedSeconds: number | null }[],
  ): string | null => {
    const window = computeBestFocusWindow(sessions);
    if (!window) {
      return null;
    }

    return `Your best focus window is ${formatHour(window.startHour)}-${formatHour(window.endHour)}`;
  };
}
