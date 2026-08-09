import { SessionEndReason } from "@prisma/client";
import { ISessionRoughness } from "@/utils/helpers/sessionRoughness";
import { ISessionDistractionTimingTier } from "@/utils/helpers/distractionTiming";

// design-artifacts/evolution/specs/14-session-timeline.md
export type ISessionTimelineStep = {
  id: string;
  title: string;
  // Clamped to this session's [startedAt, endedAt] boundary -- a task begun
  // in an earlier session (a mission can span multiple sessions) shows only
  // its in-session portion here, never its true original start.
  startedAt: string;
  completedAt: string | null;
  actualSeconds: number;
  estimatedMinutes: number | null;
};

export type ISessionTimelineDistraction = {
  id: string;
  occurredAt: string;
  packageName: string;
  appName: string | null;
  // Which step's clipped window contained this moment -- null if the block
  // fired between steps (session started but first step not yet active,
  // between two steps, or after the last step completed).
  stepId: string | null;
};

export type ISessionDistractionTiming = {
  tier: ISessionDistractionTimingTier;
  firstBlockElapsedSeconds: number | null;
  firstBlockElapsedPercent: number | null;
  baselineElapsedPercent: number | null;
};

export type ISessionTimelineDto = {
  id: string;
  missionId: string;
  missionTitle: string;
  startedAt: string;
  endedAt: string;
  sessionEndReason: SessionEndReason | null;
  roughness: ISessionRoughness;
  steps: ISessionTimelineStep[];
  distractions: ISessionTimelineDistraction[];
  distractionTiming: ISessionDistractionTiming;
};

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
  expiredAt: string;
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
