import OpenAI from "openai";
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
 * Shared base for the two `openai` SDK-based providers (OpenRouter, OpenAI).
 * OpenRouter's Chat Completions endpoint is OpenAI-compatible, so both
 * providers issue the identical request and handle the response identically
 * — only `baseURL`/`apiKey` differ, which subclasses supply via the
 * constructor.
 */
export abstract class OpenAICompatibleProvider implements AIProvider {
  private readonly client: OpenAI;

  protected constructor(options: { apiKey: string | null; baseURL?: string }) {
    this.client = new OpenAI({
      apiKey: options.apiKey ?? undefined,
      baseURL: options.baseURL,
    });
  }

  public breakdown = async (taskText: string): Promise<IMissionPlan> => {
    let response;
    try {
      response = await this.client.chat.completions.create({
        model: env.aiModel,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: taskText },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "mission_plan",
            schema: PLAN_SCHEMA,
            strict: true,
          },
        },
      });
    } catch (error) {
      throw new AppError(AI_UNAVAILABLE_MESSAGE, httpStatus.SERVICE_UNAVAILABLE);
    }

    const choice = response.choices[0];
    const message = choice?.message;

    if (!message) {
      throw new AppError(AI_UNAVAILABLE_MESSAGE, httpStatus.SERVICE_UNAVAILABLE);
    }

    if (message.refusal || choice.finish_reason === "content_filter") {
      throw new AppError(AI_REFUSAL_MESSAGE, httpStatus.UNPROCESSABLE_ENTITY);
    }

    if (!message.content) {
      throw new AppError(AI_UNAVAILABLE_MESSAGE, httpStatus.SERVICE_UNAVAILABLE);
    }

    try {
      return JSON.parse(message.content) as IMissionPlan;
    } catch (error) {
      throw new AppError(AI_REFUSAL_MESSAGE, httpStatus.UNPROCESSABLE_ENTITY);
    }
  };
}
