import httpStatus from "http-status";
import { AppError } from "@/utils/helpers/appError";
import { getAIProvider } from "@/services/ai/providerFactory";
import { AI_REFUSAL_MESSAGE, IMissionPlan } from "@/services/ai/types";

export class MissionPlannerService {
  public static breakdown = async (taskText: string): Promise<IMissionPlan> => {
    try {
      const steps = await getAIProvider().breakdown(taskText);

      // A schema-conformant response can still have mismatched array
      // lengths (standard JSON Schema can't express "same length as
      // another array") — treat that as unusable output rather than
      // silently guessing which minutes belong to which step.
      if (steps.remainingSteps.length !== steps.remainingStepsMinutes.length) {
        throw new AppError(AI_REFUSAL_MESSAGE, httpStatus.UNPROCESSABLE_ENTITY);
      }

      // The whole-mission total is computed here, not asked of the AI
      // directly — its own arithmetic summing several numbers isn't
      // trustworthy enough to persist as-is.
      const estimatedMinutes =
        steps.nextStepMinutes + steps.remainingStepsMinutes.reduce((sum, minutes) => sum + minutes, 0);

      return { ...steps, estimatedMinutes };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError(
        "Couldn't reach the planning service — try again.",
        httpStatus.SERVICE_UNAVAILABLE,
      );
    }
  };
}
