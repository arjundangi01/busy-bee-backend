import { SubscriptionErrorType } from "@prisma/client";
import { logSubscriptionError } from "@/utils/helpers/subscriptionErrorLog";

// No RevenueCat REST API secret exists yet for outbound calls — only
// REVENUECAT_WEBHOOK_SECRET, which authenticates inbound webhook deliveries
// (see spec-account-deletion.md's Spec Change Log). So "attempt cancellation"
// can't make a live API call; the attempt itself always resolves to this —
// logged as CANCEL_FAILED so the anomaly is queryable for manual follow-up
// (Play Store/App Store subscription management), same as a real failed
// cancellation attempt would be. This is a deliberate, permanent design for
// this pass, not a half-finished stub — see the spec's Spec Change Log
// "Follow-up" note for the two call sites to update if/when a real
// outbound-cancel API secret is ever provisioned.
const NO_OUTBOUND_CREDENTIAL_REASON =
  "No outbound RevenueCat API credential is configured (REVENUECAT_WEBHOOK_SECRET only " +
  "authenticates inbound webhook calls) — automated cancellation was not attempted; the " +
  "subscription must be cancelled manually via Play Store/App Store subscription management.";

export const attemptSubscriptionCancellation = async (
  context: Record<string, unknown>,
): Promise<void> => {
  try {
    await logSubscriptionError(SubscriptionErrorType.CANCEL_FAILED, {
      reason: NO_OUTBOUND_CREDENTIAL_REASON,
      ...context,
    });
  } catch (error) {
    // Recording this anomaly is best-effort observability, not a required
    // step — a transient failure here (e.g. a DB blip) must never block the
    // deletion or webhook flow that called this.
    console.error("Failed to log CANCEL_FAILED subscription error:", error);
  }
};
