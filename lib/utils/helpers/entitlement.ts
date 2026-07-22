import { Subscription, SubscriptionStatus } from "@prisma/client";
import { prismaClient } from "@/db/db";

export const deriveIsPro = (subscription: Subscription | null): boolean => {
  if (!subscription) return false;
  if (subscription.status !== SubscriptionStatus.ACTIVE) return false;
  if (subscription.expiresAt && subscription.expiresAt.getTime() < Date.now()) return false;
  return true;
};

export const isUserPro = async (userId: string): Promise<boolean> => {
  const subscription = await prismaClient.subscription.findUnique({ where: { userId } });
  return deriveIsPro(subscription);
};
