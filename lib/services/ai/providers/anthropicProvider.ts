import Anthropic from "@anthropic-ai/sdk";
import httpStatus from "http-status";
import { env } from "@/utils/configuration/env";
import { AppError } from "@/utils/helpers/appError";
import {
  AIProvider,
  IMissionPlan,
  PLAN_SCHEMA,
  SYSTEM_PROMPT,
  AI_UNAVAILABLE_MESSAGE,
  AI_REFUSAL_MESSAGE,
} from "@/services/ai/types";

/**
 * Behavior-neutral move of the original `MissionPlannerService.breakdown`
 * Anthropic call — same request shape, same error mapping. Only the
 * hardcoded `"claude-opus-4-8"` model string was replaced with `env.aiModel`
 * so the model is configurable via `AI_MODEL`.
 */
export class AnthropicProvider implements AIProvider {
  private client: Anthropic;

  constructor() {
    this.client = new Anthropic({ apiKey: env.anthropicApiKey ?? undefined });
  }

  public breakdown = async (taskText: string): Promise<IMissionPlan> => {
    let response;
    try {
      response = await this.client.messages.create({
        model: env.aiModel,
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        output_config: {
          effort: "low",
          format: { type: "json_schema", schema: PLAN_SCHEMA },
        },
        messages: [{ role: "user", content: taskText }],
      });
    } catch (error) {
      throw new AppError(AI_UNAVAILABLE_MESSAGE, httpStatus.SERVICE_UNAVAILABLE);
    }

    if (response.stop_reason === "refusal") {
      throw new AppError(AI_REFUSAL_MESSAGE, httpStatus.UNPROCESSABLE_ENTITY);
    }

    const block = response.content.find((item) => item.type === "text");
    if (!block || block.type !== "text") {
      throw new AppError(AI_UNAVAILABLE_MESSAGE, httpStatus.SERVICE_UNAVAILABLE);
    }

    return JSON.parse(block.text) as IMissionPlan;
  };
}
