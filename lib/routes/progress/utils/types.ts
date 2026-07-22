import { IFocusWindow } from "@/utils/helpers/focusWindow";

export type IStreakCalendarCellStatus = "hit" | "miss" | "today" | "no-history";

export type IStreakCalendarCell = {
  date: string;
  status: IStreakCalendarCellStatus;
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
  distractionAttemptsThisWeek: number;
  isColdStart: boolean;
};
