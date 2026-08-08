import { SubscriptionErrorType } from "@prisma/client";
import { logSubscriptionError } from "@/utils/helpers/subscriptionErrorLog";

// No RevenueCat REST API secret exists yet for outbound calls — only
// REVENUECAT_WEBHOOK_SECRET, which authenticates inbound webhook deliveries
// (see spec-account-deletion.md's Spec Change Log). So "attempt cancellation"
// can't make a live API call; the attempt itself always resolves to this —
// logged as CANCEL_FAILED so the anomaly is queryable for manual follow-up
// (Play Store/App Store subscription management), same as a real failed
// cancellation attempt would be.
const NO_OUTBOUND_CREDENTIAL_REASON =
  "No outbound RevenueCat API credential is configured (REVENUECAT_WEBHOOK_SECRET only " +
  "authenticates inbound webhook calls) — automated cancellation was not attempted; the " +
  "subscription must be cancelled manually via Play Store/App Store subscription management.";

export const attemptSubscriptionCancellation = async (
  context: Record<string, unknown>,
): Promise<void> => {
  await logSubscriptionError(SubscriptionErrorType.CANCEL_FAILED, {
    reason: NO_OUTBOUND_CREDENTIAL_REASON,
    ...context,
  });
};
