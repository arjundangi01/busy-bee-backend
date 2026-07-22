import { SubscriptionStatus } from "@prisma/client";

export type IPlanLimitsDto = {
  dailySessionCap: number | null;
  sessionDurationCapSeconds: number | null;
};

export type ISubscriptionStatusDto = {
  isPro: boolean;
  status: SubscriptionStatus | null;
  expiresAt: string | null;
  productId: string | null;
  limits: IPlanLimitsDto;
};
