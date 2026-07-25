import { env } from "@/utils/configuration/env";
import { AIProviderName } from "@/utils/enums/enums";
import { AIProvider } from "@/services/ai/types";
import { AnthropicProvider } from "@/services/ai/providers/anthropicProvider";
import { OpenAIProvider } from "@/services/ai/providers/openaiProvider";
import { OpenRouterProvider } from "@/services/ai/providers/openrouterProvider";

let cachedProvider: AIProvider | null = null;

const buildProvider = (): AIProvider => {
  switch (env.aiProvider) {
    case AIProviderName.ANTHROPIC:
      return new AnthropicProvider();
    case AIProviderName.OPENAI:
      return new OpenAIProvider();
    case AIProviderName.OPENROUTER:
      return new OpenRouterProvider();
    default:
      throw new Error(`Unsupported AI provider: ${env.aiProvider}`);
  }
};

/**
 * Single call site for provider selection. Reads `env.aiProvider` (from
 * `AI_PROVIDER`, default `AIProviderName.OPENROUTER`) and returns the
 * matching `AIProvider` implementation, cached for the process lifetime
 * (mirrors the old module-scope `const client = new Anthropic(...)`).
 */
export const getAIProvider = (): AIProvider => {
  if (!cachedProvider) {
    cachedProvider = buildProvider();
  }

  return cachedProvider;
};
