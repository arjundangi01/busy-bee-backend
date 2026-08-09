import { FocusSession, Prisma } from "@prisma/client";

// Single source of truth for "is a focus session active." Every place that
// needs this — route guards, Prisma queries, the cron sweep — must go
// through here rather than re-deriving endedAt/expiredAt logic locally, so a
// future change to the rule (new tier, grace period, etc.) only needs to
// change one place.
//
// Free sessions are active only until their locked-in expiredAt passes.
// Pro sessions have no real cap, so only endedAt matters for them —
// expiredAt is just a 24h safety net the cron sweep (expiredSessionWhere)
// eventually closes, not a condition that flips a Pro session "inactive"
// on read.

export const SAFETY_NET_SECONDS = 24 * 60 * 60;

export const isSessionActive = (
  session: Pick<FocusSession, "endedAt" | "expiredAt">,
  isPro: boolean,
  now: Date = new Date(),
): boolean => {
  if (session.endedAt !== null) return false;
  if (isPro) return true;
  return now < session.expiredAt;
};

export const activeSessionWhere = (
  isPro: boolean,
  now: Date = new Date(),
): Prisma.FocusSessionWhereInput =>
  isPro ? { endedAt: null } : { endedAt: null, expiredAt: { gt: now } };

// Cron sweep candidates: tier-agnostic on purpose. expiredAt already encodes
// the right threshold for both tiers at write time (real cap for Free, 24h
// backstop for Pro), so closing stale sessions doesn't need to branch on
// tier at all.
export const expiredSessionWhere = (now: Date = new Date()): Prisma.FocusSessionWhereInput => ({
  endedAt: null,
  expiredAt: { lte: now },
});
