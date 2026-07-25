import "dotenv/config";
import { AIProviderName, ENV } from "@/utils/enums/enums";

const parsePort = (raw: string | undefined): number => {
  const parsed = Number(raw);
  return raw && !Number.isNaN(parsed) ? parsed : 4000;
};

const parseAIProvider = (raw: string | undefined): AIProviderName => {
  if (!raw) {
    return AIProviderName.OPENROUTER;
  }

  const match = Object.values(AIProviderName).find((value) => value === raw.toLowerCase());
  if (!match) {
    throw new Error(
      `AI_PROVIDER "${raw}" is not supported — expected one of: ${Object.values(AIProviderName).join(", ")}`,
    );
  }

  return match;
};

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required — copy .env.example to .env and set it");
}

if (!process.env.SESSION_TOKEN_SECRET) {
  throw new Error("SESSION_TOKEN_SECRET is required — copy .env.example to .env and set it");
}

const aiProvider = parseAIProvider(process.env.AI_PROVIDER);

// Only the selected provider's key is required at boot — the other two stay
// optional so switching AI_PROVIDER never demands unrelated credentials.
const AI_PROVIDER_API_KEY_ENV_VAR: Record<AIProviderName, string> = {
  [AIProviderName.OPENROUTER]: "OPENROUTER_API_KEY",
  [AIProviderName.ANTHROPIC]: "ANTHROPIC_API_KEY",
  [AIProviderName.OPENAI]: "OPENAI_API_KEY",
};

const requiredAIApiKeyEnvVar = AI_PROVIDER_API_KEY_ENV_VAR[aiProvider];
if (!process.env[requiredAIApiKeyEnvVar]) {
  throw new Error(
    `${requiredAIApiKeyEnvVar} is required when AI_PROVIDER=${aiProvider} — copy .env.example to .env and set it`,
  );
}

// `AI_MODEL` is not a valid model id across every provider (e.g. OpenRouter's
// default id fails verbatim against the Anthropic/OpenAI SDKs), so each
// provider needs its own default. `AI_MODEL`, when set, overrides whichever
// provider is currently active.
const AI_PROVIDER_DEFAULT_MODEL: Record<AIProviderName, string> = {
  [AIProviderName.OPENROUTER]: "openai/gpt-oss-20b:free",
  [AIProviderName.ANTHROPIC]: "claude-opus-4-8",
  [AIProviderName.OPENAI]: "gpt-4o-mini",
};

// `||`, not `??` — an empty-string AI_MODEL (e.g. left blank in .env) must
// also fall through to the provider default, not resolve to "".
const aiModel = process.env.AI_MODEL || AI_PROVIDER_DEFAULT_MODEL[aiProvider];

export const env = {
  port: parsePort(process.env.PORT),
  databaseUrl: process.env.DATABASE_URL,
  sessionTokenSecret: process.env.SESSION_TOKEN_SECRET,
  mode: (process.env.NODE_ENV as ENV) ?? ENV.DEVELOPMENT,
  aiProvider,
  aiModel,
  // Only the key matching `aiProvider` is guaranteed present (validated
  // above) — the rest are optional, same `string | null` pattern as
  // `revenueCatWebhookSecret` below.
  anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? null,
  openrouterApiKey: process.env.OPENROUTER_API_KEY ?? null,
  openaiApiKey: process.env.OPENAI_API_KEY ?? null,
  // DD-003: optional, not required at boot — no RevenueCat account/products
  // exist yet. The webhook route rejects requests until this is set for real.
  revenueCatWebhookSecret: process.env.REVENUECAT_WEBHOOK_SECRET ?? null,
  // Google social login: optional, not required at boot — paste the full
  // Firebase service-account JSON as a single-line string. POST /auth/google
  // returns a clear error until this is set for real.
  firebaseServiceAccountJson: process.env.FIREBASE_SERVICE_ACCOUNT_JSON ?? null,
};
