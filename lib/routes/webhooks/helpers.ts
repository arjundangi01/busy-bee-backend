import { Prisma, SubscriptionErrorType, SubscriptionProvider, SubscriptionStatus } from "@prisma/client";
import { prismaClient } from "@/db/db";
import { logSubscriptionError } from "@/utils/helpers/subscriptionErrorLog";
import { attemptSubscriptionCancellation } from "@/utils/helpers/subscriptionCancellation";
import { isNonEmptyString } from "@/utils/helpers/common";
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

    // Malformed delivery — nothing to key idempotency off of. Not one of
    // the defined SubscriptionErrorType values (those describe anomalies in
    // an otherwise-identifiable event), so this stays a console warning
    // rather than a DB log.
    if (!isNonEmptyString(event.id)) {
      console.warn("RevenueCat webhook event missing id — skipping", {
        eventType: event.type,
        appUserId: event.app_user_id,
      });
      return;
    }

    const eventState = await WebhooksHelpers.recordEventOnce(event.id);
    if (eventState === "duplicate") {
      await logSubscriptionError(SubscriptionErrorType.DUPLICATE_EVENT, {
        eventId: event.id,
        eventType: event.type,
        appUserId: event.app_user_id,
      });
      return;
    }

    // "retry" means a prior delivery of this same event started processing
    // but never reached markEventCompleted (e.g. crashed mid-way) — treated
    // like "new" and reprocessed, rather than permanently swallowed.
    await WebhooksHelpers.processEvent(event);
    await WebhooksHelpers.markEventCompleted(event.id);
  };

  private static processEvent = async (event: IRevenueCatWebhookEvent["event"]): Promise<void> => {
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
  // "duplicate" only for a row that reached markEventCompleted — a row that
  // exists but never completed means the prior attempt errored out, so it's
  // safe (and necessary) to reprocess rather than silently drop it forever.
  private static recordEventOnce = async (eventId: string): Promise<"new" | "retry" | "duplicate"> => {
    try {
      await prismaClient.processedRevenueCatEvent.create({ data: { eventId } });
      return "new";
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        const existing = await prismaClient.processedRevenueCatEvent.findUnique({ where: { eventId } });
        return existing?.completedAt ? "duplicate" : "retry";
      }
      throw error;
    }
  };

  private static markEventCompleted = async (eventId: string): Promise<void> => {
    await prismaClient.processedRevenueCatEvent.update({
      where: { eventId },
      data: { completedAt: new Date() },
    });
  };
}
