export type IRevenueCatWebhookEvent = {
  event: {
    type: string;
    app_user_id: string;
    product_id: string;
    store: string;
    expiration_at_ms: number | null;
    original_transaction_id?: string;
  };
};
