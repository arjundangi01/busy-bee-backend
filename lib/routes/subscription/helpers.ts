import { prismaClient } from "@/db/db";
import { deriveIsPro } from "@/utils/helpers/entitlement";
import { ISubscriptionStatusDto } from "@/routes/subscription/utils/types";

export class SubscriptionHelpers {
  public static getStatus = async (userId: string): Promise<ISubscriptionStatusDto> => {
    const subscription = await prismaClient.subscription.findUnique({ where: { userId } });

    return {
      isPro: deriveIsPro(subscription),
      status: subscription?.status ?? null,
      expiresAt: subscription?.expiresAt?.toISOString() ?? null,
      productId: subscription?.productId ?? null,
    };
  };
}
