import { SubscriptionProvider, SubscriptionStatus } from "@prisma/client";
import { prismaClient } from "@/db/db";
import { IRevenueCatWebhookEvent } from "@/routes/webhooks/utils/types";

const STORE_TO_PROVIDER: Record<string, SubscriptionProvider> = {
  APP_STORE: SubscriptionProvider.IOS,
  MAC_APP_STORE: SubscriptionProvider.IOS,
  PLAY_STORE: SubscriptionProvider.ANDROID,
};

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

    const user = await prismaClient.user.findUnique({ where: { id: event.app_user_id } });
    if (!user) {
      // RevenueCat's app_user_id didn't match a real user (e.g. a sandbox/test
      // event fired before Purchases.logIn() ran) — nothing to update, no error.
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
}
