import { Prisma, SubscriptionErrorType } from "@prisma/client";
import { prismaClient } from "@/db/db";

// Shared by the RevenueCat webhook handler and the account-deletion routine —
// both write to the same anomaly log (see SubscriptionErrorType), so the
// insert itself lives here rather than being duplicated in each feature.
export const logSubscriptionError = async (
  type: SubscriptionErrorType,
  context: Prisma.InputJsonValue,
): Promise<void> => {
  await prismaClient.subscriptionErrorLog.create({ data: { type, context } });
};
