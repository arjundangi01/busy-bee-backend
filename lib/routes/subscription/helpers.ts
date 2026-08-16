import { prismaClient } from "@/db/db";
import { getPlanLimitsForUser, isUserPro } from "@/utils/helpers/entitlement";
import { ISubscriptionStatusDto } from "@/routes/subscription/utils/types";

export class SubscriptionHelpers {
  public static getStatus = async (userId: string): Promise<ISubscriptionStatusDto> => {
    // isPro goes through the global isUserPro helper (admin override +
    // subscription), not deriveIsPro(subscription) directly — this is the
    // field the FE's useEntitlement hook trusts, so it must never diverge
    // from what every other Pro-gated route checks.
    const [subscription, limits, isPro] = await Promise.all([
      prismaClient.subscription.findUnique({ where: { userId } }),
      getPlanLimitsForUser(userId),
      isUserPro(userId),
    ]);

    return {
      isPro,
      status: subscription?.status ?? null,
      expiresAt: subscription?.expiresAt?.toISOString() ?? null,
      productId: subscription?.productId ?? null,
      limits: {
        dailySessionCap: limits.dailySessionCap,
        sessionDurationCapSeconds: limits.sessionDurationCapSeconds,
        maxTasksPerMission: limits.maxTasksPerMission,
        maxMissionMinutes: limits.maxMissionMinutes,
      },
    };
  };
}
