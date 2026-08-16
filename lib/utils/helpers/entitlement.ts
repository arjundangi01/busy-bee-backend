import httpStatus from "http-status";
import { PlanTier, Subscription, SubscriptionStatus } from "@prisma/client";
import { prismaClient } from "@/db/db";
import { AppError } from "@/utils/helpers/appError";

export type IPlanLimits = {
  tier: PlanTier;
  dailySessionCap: number | null;
  sessionDurationCapSeconds: number | null;
  maxTasksPerMission: number | null;
  maxMissionMinutes: number | null;
};

export const deriveIsPro = (subscription: Subscription | null): boolean => {
  if (!subscription) return false;
  if (subscription.status !== SubscriptionStatus.ACTIVE) return false;
  if (subscription.expiresAt && subscription.expiresAt.getTime() < Date.now()) return false;
  return true;
};

// The single source of truth for "does this user have Pro access" — every
// route (BE) and the /subscription/status response consumed by the FE's
// useEntitlement hook must go through this, never re-derive it from a raw
// subscription row. Admin override takes priority; more override
// conditions (e.g. promo/comp access) belong here too, not at call sites.
export const isUserPro = async (userId: string): Promise<boolean> => {
  const user = await prismaClient.user.findUnique({
    where: { id: userId },
    select: { isAdmin: true, subscription: true },
  });
  if (!user) return false;
  if (user.isAdmin) return true;
  return deriveIsPro(user.subscription);
};

// Free/Pro limits are config rows (PlanLimits), not source constants — this
// is the one place both enforcement (focus-sessions) and display
// (subscription/status) read them from, so a DB update changes both.
export const getPlanLimitsForUser = async (userId: string): Promise<IPlanLimits> => {
  const isPro = await isUserPro(userId);
  const tier = isPro ? PlanTier.PRO : PlanTier.FREE;

  const limits = await prismaClient.planLimits.findUnique({ where: { tier } });
  if (!limits) {
    // A missing row is a real deploy/seed problem, not a normal Free-tier
    // state — fail loudly rather than silently defaulting to "unlimited"
    // (which would be a real entitlement bypass) or "zero" (which would
    // lock every user out).
    throw new AppError(`PlanLimits row missing for tier ${tier}`, httpStatus.INTERNAL_SERVER_ERROR);
  }

  return {
    tier: limits.tier,
    dailySessionCap: limits.dailySessionCap,
    sessionDurationCapSeconds: limits.sessionDurationCapSeconds,
    maxTasksPerMission: limits.maxTasksPerMission,
    maxMissionMinutes: limits.maxMissionMinutes,
  };
};
