import { ISessionSummary } from "@/routes/focus-sessions/utils/types";

export type ITrendDayStatus = "hit" | "miss" | "today";

export type ITrendDay = {
  date: string;
  status: ITrendDayStatus;
};

export type ITodayCard = {
  sessionsCompleted: number;
  minutesFocused: number;
  tasksWaiting: number;
  sessions: ISessionSummary[];
  roughSessionCount: number;
};

export type IActiveSession = {
  focusSessionId: string;
  missionId: string;
  startedAt: string;
};

export type IDashboardDto = {
  name: string;
  streakDays: number;
  backlogCount: number;
  timeReclaimedMinutes: number;
  trend: ITrendDay[];
  today: ITodayCard;
  patternSignal: string | null;
  isColdStart: boolean;
  activeSession: IActiveSession | null;
};
