export type IMissionPlan = {
  nextStep: string;
  remainingSteps: string[];
};

/**
 * Contract every AI provider (OpenRouter, Anthropic, OpenAI) implements.
 * `MissionPlannerService` depends only on this interface — never on a
 * specific SDK — so the provider can be swapped via `getAIProvider()`
 * without touching callers.
 */
export interface AIProvider {
  breakdown(taskText: string): Promise<IMissionPlan>;
}

export const PLAN_SCHEMA = {
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

export const SYSTEM_PROMPT = `You break a task someone just typed into a short plan. Return the single
next-smallest concrete step they should do right now, plus any remaining steps after it. Never
frame a step by how long it takes (no "10-minute step" style language) — describe what to do, not
how long it takes.`;

/** Request/network failure, missing message, or unparseable output. */
export const AI_UNAVAILABLE_MESSAGE = "Couldn't reach the planning service — try again.";

/** Model refusal or content-filtered response. */
export const AI_REFUSAL_MESSAGE = "Couldn't break that task down — try rephrasing it.";
