export type IRevenueCatWebhookEvent = {
  event: {
    // RevenueCat's own unique id for this delivery — used for the
    // event-id idempotency check (RevenueCat can and does redeliver).
    id: string;
    type: string;
    app_user_id: string;
    product_id: string;
    store: string;
    expiration_at_ms: number | null;
    original_transaction_id?: string;
  };
};
