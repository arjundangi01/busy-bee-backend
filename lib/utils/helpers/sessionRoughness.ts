import { SessionEndReason } from "@prisma/client";
import { dayKey } from "@/utils/helpers/date";

// design-artifacts/evolution/specs/12-post-session-history-and-roughness.md —
// classifies how a single FocusSession went, for the Home/Evening
// Review/History roughness badge. Computed per session directly (no
// mission-level aggregation) since blockedAttemptCount/sessionEndReason
// already live on the session row itself.
export type ISessionRoughness = "clean" | "mixed" | "rough";

const ROUGH_BLOCKED_ATTEMPT_THRESHOLD = 3;

type IRoughnessSession = {
  id: string;
  blockedAttemptCount: number;
  sessionEndReason: SessionEndReason | null;
  startedAt: Date;
  endedAt: Date | null;
};

// "Bounced back" mirrors ProgressHelpers.computeBounceBackRatePercent's own
// definition exactly (any new session, any mission, later the same calendar
// day) — reused here rather than redefined, so the two features never
// silently disagree on what counts as a fresh start.
const wasSessionBouncedBack = (session: IRoughnessSession, allUserSessions: { id: string; startedAt: Date }[]): boolean => {
  const referenceTime = session.endedAt ?? session.startedAt;
  return allUserSessions.some(
    (candidate) =>
      candidate.id !== session.id &&
      candidate.startedAt > referenceTime &&
      dayKey(candidate.startedAt) === dayKey(referenceTime),
  );
};

// allUserSessions must include every session for the user (not just the page
// being classified) so a same-day bounce-back near a pagination boundary is
// still detected correctly.
export const classifySessionRoughness = (
  session: IRoughnessSession,
  allUserSessions: { id: string; startedAt: Date }[],
): ISessionRoughness => {
  if (session.blockedAttemptCount >= ROUGH_BLOCKED_ATTEMPT_THRESHOLD) {
    return "rough";
  }

  if (session.sessionEndReason === SessionEndReason.EARLY_EXIT) {
    return wasSessionBouncedBack(session, allUserSessions) ? "mixed" : "rough";
  }

  if (session.sessionEndReason === SessionEndReason.TIME_LIMIT_REACHED) {
    return "mixed";
  }

  if (session.sessionEndReason === SessionEndReason.MISSION_COMPLETED) {
    return session.blockedAttemptCount === 0 ? "clean" : "mixed";
  }

  // Sessions with no end reason (still active) aren't meant to reach this
  // function — callers exclude them before classifying. Falls back to
  // "mixed" rather than throwing, since a bad classification is far less
  // harmful than a crashed request.
  return "mixed";
};
