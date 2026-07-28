import { SessionEndReason } from "@prisma/client";
import { ISessionRoughness } from "@/utils/helpers/sessionRoughness";

export type ISessionSummary = {
  id: string;
  missionId: string;
  missionTitle: string;
  startedAt: string;
  endedAt: string | null;
  roughness: ISessionRoughness;
};

export type IPaginatedSessionHistory = {
  items: ISessionSummary[];
  nextCursor: string | null;
};

export type IFocusSessionDto = {
  id: string;
  missionId: string;
  startedAt: string;
  endedAt: string | null;
  elapsedSeconds: number | null;
  sessionEndReason: SessionEndReason | null;
  blockedAttemptCount: number;
  workTypeId: string | null;
  workUnitsCompleted: number;
};

export type IStartFocusSessionPayload = {
  missionId: string;
};

export type IEndFocusSessionPayload = {
  sessionEndReason: SessionEndReason;
};

export type IRecordBlockedAttemptPayload = {
  // Nullable: older/off-Android clients call this endpoint with no body at
  // all (the native module this comes from is Android-only) — the attempt
  // count still increments, it just can't be attributed to a specific app.
  packageName: string | null;
};
