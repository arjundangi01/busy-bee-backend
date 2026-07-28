import { prismaClient } from "@/db/db";
import { deriveIsPro, getPlanLimitsForUser } from "@/utils/helpers/entitlement";
import { ISubscriptionStatusDto } from "@/routes/subscription/utils/types";

export class SubscriptionHelpers {
  public static getStatus = async (userId: string): Promise<ISubscriptionStatusDto> => {
    const [subscription, limits] = await Promise.all([
      prismaClient.subscription.findUnique({ where: { userId } }),
      getPlanLimitsForUser(userId),
    ]);

    return {
      isPro: deriveIsPro(subscription),
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
