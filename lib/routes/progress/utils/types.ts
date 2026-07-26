import { IFocusWindow } from "@/utils/helpers/focusWindow";

export type IStreakCalendarCellStatus = "hit" | "miss" | "today" | "no-history";

export type IStreakCalendarCell = {
  date: string;
  status: IStreakCalendarCellStatus;
};

export type ITopDistraction = {
  appName: string;
  count: number;
};

export type IProgressDto = {
  currentStreakDays: number;
  bestStreakDays: number;
  streakCalendar: IStreakCalendarCell[];
  timeReclaimedThisWeekMinutes: number;
  // Oldest -> newest, one entry per rolling 7-day week. Weeks entirely
  // before account creation are omitted, not zero-padded (Cold Start rule).
  timeReclaimedByWeekMinutes: number[];
  focusDurationByWeekMinutes: number[];
  currentAvgFocusMinutes: number | null;
  bestFocusWindow: IFocusWindow | null;
  toughestDay: string | null;
  // Replaces the old bare distractionAttemptsThisWeek count — names the
  // actual top offending app, from real per-app data (BlockedAttemptEvent).
  topDistraction: ITopDistraction | null;
  longestFocusMinutes: number | null;
  sessionsEndedEarlyThisWeek: number;
  tasksPastTheirTime: number;
  timeToStartMinutes: number | null;
  bounceBackRatePercent: number | null;
  missionCompletionRatePercent: number | null;
  stepCompletionRatePercent: number | null;
  isColdStart: boolean;
};
