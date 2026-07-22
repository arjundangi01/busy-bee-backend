import { SessionEndReason } from "@prisma/client";

export type IFocusSessionDto = {
  id: string;
  missionId: string;
  startedAt: string;
  endedAt: string | null;
  elapsedSeconds: number | null;
  sessionEndReason: SessionEndReason | null;
  blockedAttemptCount: number;
};

export type IStartFocusSessionPayload = {
  missionId: string;
};

export type IEndFocusSessionPayload = {
  sessionEndReason: SessionEndReason;
};
