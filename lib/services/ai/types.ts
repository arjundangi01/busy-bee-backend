// Raw shape every AI provider returns — per-step minutes, not a
// whole-mission total. The AI's own arithmetic can't be trusted to sum its
// own parts correctly, so the total is derived server-side (see
// missionPlanner.ts) rather than asked for directly.
export type IMissionPlanSteps = {
  nextStep: string;
  nextStepMinutes: number;
  remainingSteps: string[];
  remainingStepsMinutes: number[];
};

// Consumer-facing shape — the raw per-step plan plus the derived
// whole-mission total (nextStepMinutes + sum(remainingStepsMinutes)).
export type IMissionPlan = IMissionPlanSteps & {
  estimatedMinutes: number;
};

/**
 * Contract every AI provider (OpenRouter, Anthropic, OpenAI) implements.
 * `MissionPlannerService` depends only on this interface — never on a
 * specific SDK — so the provider can be swapped via `getAIProvider()`
 * without touching callers.
 */
export interface AIProvider {
  breakdown(taskText: string): Promise<IMissionPlanSteps>;
}

export const PLAN_SCHEMA = {
  type: "object",
  properties: {
    nextStep: {
      type: "string",
      description: "The single next-smallest concrete action to take, in plain language. No time estimates.",
    },
    nextStepMinutes: {
      type: "integer",
      description:
        "A realistic, grounded estimate of the minutes a normal person needs for JUST this one step, " +
        "based on real-world pace for that kind of action. Not padded, not deflated, and not forced " +
        "to match any other step's estimate.",
    },
    remainingSteps: {
      type: "array",
      items: { type: "string" },
      description:
        "Any further steps after the next step, in order. Empty for most quick/simple tasks — only " +
        "non-empty when the task genuinely has multiple distinct stages.",
    },
    remainingStepsMinutes: {
      type: "array",
      items: { type: "integer" },
      description:
        "One realistic minute estimate per entry in remainingSteps, same order, same length (empty " +
        "array if remainingSteps is empty). Each step's estimate stands on its own — steps that " +
        "genuinely take different amounts of time should get different numbers, not a uniform value.",
    },
  },
  required: ["nextStep", "nextStepMinutes", "remainingSteps", "remainingStepsMinutes"],
  additionalProperties: false,
};

export const SYSTEM_PROMPT = `You break a task someone just typed into a short plan. Return the single
next-smallest concrete step they should do right now, plus any remaining steps after it, plus a
realistic time estimate for each individual step.

Step count must match real complexity — do not pad. Most quick/simple tasks (a single errand, one
message to send, one small chore) are exactly ONE step with an empty remainingSteps array. Only add
further steps when the task genuinely has multiple distinct stages that have to happen in order.
Never invent busywork steps just to produce a longer-looking list. Each step you do return must be
concrete and independently completable — no vague or overlapping steps.

Never frame a step by how long it takes (no "10-minute step" style language in the step text itself)
— describe what to do, not how long it takes. Time estimates are separate numbers, not prose: ground
each one in how long that specific step actually takes a normal person in the real world, not an
idealized best case. Never default to a "clean" number (5, 10, 15, 30...) just because it looks tidy,
and never give every step in a plan the same estimate out of laziness — steps that are genuinely
different sizes must get different numbers. A step involving travel, waiting on something external,
or physical effort should be estimated accordingly, not as if it were instant.

Two worked examples of the calibration expected:
- "Reply to Sarah's email" → ONE step ("Reply to Sarah's email"), ~3-5 minutes — a single quick
  message is not a multi-stage project and should never be estimated as taking 15+ minutes.
- "Deep clean the garage" → multiple real stages (e.g. clear the floor, sort items to keep/donate/
  discard, sweep and organize), each realistically 20-45+ minutes depending on the actual stage — not
  a uniform 15 minutes per step, and not compressed into one step just to keep the list short.`;

/** Request/network failure, missing message, or unparseable output. */
export const AI_UNAVAILABLE_MESSAGE = "Couldn't reach the planning service — try again.";

/** Model refusal or content-filtered response. */
export const AI_REFUSAL_MESSAGE = "Couldn't break that task down — try rephrasing it.";
