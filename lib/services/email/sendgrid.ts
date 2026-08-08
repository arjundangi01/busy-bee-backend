import sgMail from "@sendgrid/mail";
import { env } from "@/utils/configuration/env";

let apiKeyConfigured = false;

/**
 * Single call site for the SendGrid client — mirrors services/ai's
 * providerFactory caching pattern. Lazily sets the API key on first use
 * rather than at import time, matching env.sendgridApiKey's "optional, not
 * required at boot" status.
 */
export const getSendgridClient = (): typeof sgMail => {
  if (!apiKeyConfigured && env.sendgridApiKey) {
    sgMail.setApiKey(env.sendgridApiKey);
    apiKeyConfigured = true;
  }
  return sgMail;
};
