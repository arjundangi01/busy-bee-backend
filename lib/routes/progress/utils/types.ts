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

export type IUsageMetric = {
  value: number;
  avg7d: number | null;
};

export type IScreenTimeAppRow = {
  packageName: string;
  appName: string;
  foregroundSeconds: number;
  isBlocked: boolean;
};

// Null means no on-device usage-stats aggregate has been posted for today
// yet — the "not enough data" state, distinct from the permission not being
// granted at all (which is a purely client-side check, see the usage-stats
// native module).
export type IScreenTimeDto = {
  totalForegroundSeconds: number;
  apps: IScreenTimeAppRow[];
} | null;

export type IDeviceActivityDto = {
  pickupCount: IUsageMetric;
  offlineSeconds: IUsageMetric;
  distractionsSeconds: IUsageMetric;
  firstPickupAt: string | null;
  lastPickupAt: string | null;
  // Raw ISO timestamps from the comparison window (only days that have one),
  // not pre-averaged — averaging a time-of-day needs the device's own local
  // timezone (Date.getHours()), which the server doesn't have and shouldn't
  // guess at. The mobile client derives minutes-since-local-midnight from
  // these directly.
  priorFirstPickupAts: string[];
  priorLastPickupAts: string[];
} | null;

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
  screenTime: IScreenTimeDto;
  deviceActivity: IDeviceActivityDto;
  isColdStart: boolean;
};
