import { SubscriptionStatus } from "@prisma/client";

export type ISubscriptionStatusDto = {
  isPro: boolean;
  status: SubscriptionStatus | null;
  expiresAt: string | null;
  productId: string | null;
};
