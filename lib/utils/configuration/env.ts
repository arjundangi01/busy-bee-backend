import "dotenv/config";
import { ENV } from "@/utils/enums/enums";

const parsePort = (raw: string | undefined): number => {
  const parsed = Number(raw);
  return raw && !Number.isNaN(parsed) ? parsed : 4000;
};

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required — copy .env.example to .env and set it");
}

if (!process.env.SESSION_TOKEN_SECRET) {
  throw new Error("SESSION_TOKEN_SECRET is required — copy .env.example to .env and set it");
}

if (!process.env.ANTHROPIC_API_KEY) {
  throw new Error("ANTHROPIC_API_KEY is required — copy .env.example to .env and set it");
}

export const env = {
  port: parsePort(process.env.PORT),
  databaseUrl: process.env.DATABASE_URL,
  sessionTokenSecret: process.env.SESSION_TOKEN_SECRET,
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  mode: (process.env.NODE_ENV as ENV) ?? ENV.DEVELOPMENT,
  // DD-003: optional, not required at boot — no RevenueCat account/products
  // exist yet. The webhook route rejects requests until this is set for real.
  revenueCatWebhookSecret: process.env.REVENUECAT_WEBHOOK_SECRET ?? null,
};
