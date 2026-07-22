import Anthropic from "@anthropic-ai/sdk";
import httpStatus from "http-status";
import { env } from "@/utils/configuration/env";
import { AppError } from "@/utils/helpers/appError";

const client = new Anthropic({ apiKey: env.anthropicApiKey });

const PLAN_SCHEMA = {
  type: "object",
  properties: {
    nextStep: {
      type: "string",
      description: "The single next-smallest concrete action to take, in plain language. No time estimates.",
    },
    remainingSteps: {
      type: "array",
      items: { type: "string" },
      description: "Any further steps after the next step, in order. Empty if the task is a single step.",
    },
  },
  required: ["nextStep", "remainingSteps"],
  additionalProperties: false,
};

const SYSTEM_PROMPT = `You break a task someone just typed into a short plan. Return the single
next-smallest concrete step they should do right now, plus any remaining steps after it. Never
frame a step by how long it takes (no "10-minute step" style language) — describe what to do, not
how long it takes.`;

export type IMissionPlan = {
  nextStep: string;
  remainingSteps: string[];
};

export class MissionPlannerService {
  public static breakdown = async (taskText: string): Promise<IMissionPlan> => {
    let response;
    try {
      response = await client.messages.create({
        model: "claude-opus-4-8",
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        output_config: {
          effort: "low",
          format: { type: "json_schema", schema: PLAN_SCHEMA },
        },
        messages: [{ role: "user", content: taskText }],
      });
    } catch (error) {
      throw new AppError(
        "Couldn't reach the planning service — try again.",
        httpStatus.SERVICE_UNAVAILABLE,
      );
    }

    if (response.stop_reason === "refusal") {
      throw new AppError(
        "Couldn't break that task down — try rephrasing it.",
        httpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    const block = response.content.find((item) => item.type === "text");
    if (!block || block.type !== "text") {
      throw new AppError(
        "Couldn't reach the planning service — try again.",
        httpStatus.SERVICE_UNAVAILABLE,
      );
    }

    const parsed = JSON.parse(block.text) as IMissionPlan;
    return parsed;
  };
}
