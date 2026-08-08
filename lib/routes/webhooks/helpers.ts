import { Prisma, SubscriptionErrorType, SubscriptionProvider, SubscriptionStatus } from "@prisma/client";
import { prismaClient } from "@/db/db";
import { logSubscriptionError } from "@/utils/helpers/subscriptionErrorLog";
import { attemptSubscriptionCancellation } from "@/utils/helpers/subscriptionCancellation";
import { IRevenueCatWebhookEvent } from "@/routes/webhooks/utils/types";

const STORE_TO_PROVIDER: Record<string, SubscriptionProvider> = {
  APP_STORE: SubscriptionProvider.IOS,
  MAC_APP_STORE: SubscriptionProvider.IOS,
  PLAY_STORE: SubscriptionProvider.ANDROID,
};

// Still-active-billing event types — an orphaned subscription for one of
// these is still charging someone with no account attached to it, so it's
// worth attempting cancellation on. Other types (EXPIRATION, CANCELLATION,
// ...) are passive state changes with nothing actively billing.
const STILL_BILLING_EVENT_TYPES = new Set(["RENEWAL", "INITIAL_PURCHASE", "BILLING_ISSUE"]);

type ISubscriptionUpsertData = {
  status: SubscriptionStatus;
  provider: SubscriptionProvider;
  productId: string;
  originalTransactionId: string | null;
  expiresAt: Date | null;
  autoRenewing: boolean;
};

export class WebhooksHelpers {
  public static handleRevenueCat = async (payload: IRevenueCatWebhookEvent): Promise<void> => {
    const { event } = payload;

    const isNewEvent = await WebhooksHelpers.recordEventOnce(event.id);
    if (!isNewEvent) {
      await logSubscriptionError(SubscriptionErrorType.DUPLICATE_EVENT, {
        eventId: event.id,
        eventType: event.type,
        appUserId: event.app_user_id,
      });
      return;
    }

    const user = await prismaClient.user.findUnique({ where: { id: event.app_user_id } });
    if (!user) {
      // RevenueCat's app_user_id didn't match a real user (e.g. a sandbox/test
      // event fired before Purchases.logIn() ran, or the account behind it
      // was since deleted) — nothing to update locally, but worth logging.
      await logSubscriptionError(SubscriptionErrorType.USER_NOT_FOUND, {
        appUserId: event.app_user_id,
        eventType: event.type,
        eventId: event.id,
      });

      // A deleted-but-still-billing subscription outliving its account is
      // exactly the case DeletionAudit/account deletion can't fully prevent
      // (billing lives in RevenueCat, not our DB) — this is the safety net.
      if (STILL_BILLING_EVENT_TYPES.has(event.type)) {
        await attemptSubscriptionCancellation({ appUserId: event.app_user_id, eventType: event.type });
      }
      return;
    }

    const shared = {
      provider: STORE_TO_PROVIDER[event.store] ?? SubscriptionProvider.IOS,
      productId: event.product_id,
      originalTransactionId: event.original_transaction_id ?? null,
      expiresAt: event.expiration_at_ms ? new Date(event.expiration_at_ms) : null,
    };

    switch (event.type) {
      case "INITIAL_PURCHASE":
      case "RENEWAL":
      case "UNCANCELLATION":
      case "PRODUCT_CHANGE":
      case "NON_RENEWING_PURCHASE":
        await WebhooksHelpers.upsertSubscription(user.id, {
          ...shared,
          status: SubscriptionStatus.ACTIVE,
          autoRenewing: true,
        });
        return;
      case "CANCELLATION":
        // Stays ACTIVE until expiresAt — cancellation just turns off renewal.
        await WebhooksHelpers.upsertSubscription(user.id, {
          ...shared,
          status: SubscriptionStatus.ACTIVE,
          autoRenewing: false,
        });
        return;
      case "EXPIRATION":
        await WebhooksHelpers.upsertSubscription(user.id, {
          ...shared,
          status: SubscriptionStatus.EXPIRED,
          autoRenewing: false,
        });
        return;
      case "BILLING_ISSUE":
        await WebhooksHelpers.upsertSubscription(user.id, {
          ...shared,
          status: SubscriptionStatus.BILLING_ISSUE,
          autoRenewing: true,
        });
        return;
      default:
        // Other event types (TEST, TRANSFER, SUBSCRIPTION_PAUSED, ...) don't
        // change entitlement here yet — no-op rather than guessing.
        return;
    }
  };

  private static upsertSubscription = async (
    userId: string,
    data: ISubscriptionUpsertData,
  ): Promise<void> => {
    await prismaClient.subscription.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
    });
  };

  // Insert-or-detect-duplicate on the unique eventId column, rather than a
  // separate exists-check followed by an insert — that two-step form would
  // race two near-simultaneous redeliveries; this can't, since the database
  // itself is the single point of truth for "have I seen this id before."
  private static recordEventOnce = async (eventId: string): Promise<boolean> => {
    try {
      await prismaClient.processedRevenueCatEvent.create({ data: { eventId } });
      return true;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        return false;
      }
      throw error;
    }
  };
}
