import { env } from "@/utils/configuration/env";
import { OpenAICompatibleProvider } from "@/services/ai/providers/openAICompatibleProvider";

/**
 * Default provider. OpenRouter's Chat Completions endpoint is
 * OpenAI-compatible, so all request/response handling lives in the shared
 * `OpenAICompatibleProvider` base — this class only supplies OpenRouter's
 * `baseURL`/`apiKey`.
 */
export class OpenRouterProvider extends OpenAICompatibleProvider {
  constructor() {
    super({ apiKey: env.openrouterApiKey, baseURL: "https://openrouter.ai/api/v1" });
  }
}
