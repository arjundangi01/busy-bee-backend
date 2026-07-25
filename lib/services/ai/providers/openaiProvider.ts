import { env } from "@/utils/configuration/env";
import { OpenAICompatibleProvider } from "@/services/ai/providers/openAICompatibleProvider";

/**
 * Direct-OpenAI path. Request/response handling lives in the shared
 * `OpenAICompatibleProvider` base — this class only supplies OpenAI's API
 * key. `baseURL` is left unset so the `openai` SDK falls back to its default
 * (OpenAI's own API).
 */
export class OpenAIProvider extends OpenAICompatibleProvider {
  constructor() {
    super({ apiKey: env.openaiApiKey });
  }
}
