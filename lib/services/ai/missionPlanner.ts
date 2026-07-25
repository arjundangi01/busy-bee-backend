import httpStatus from "http-status";
import { AppError } from "@/utils/helpers/appError";
import { getAIProvider } from "@/services/ai/providerFactory";
import { IMissionPlan } from "@/services/ai/types";

export class MissionPlannerService {
  public static breakdown = async (taskText: string): Promise<IMissionPlan> => {
    try {
      return await getAIProvider().breakdown(taskText);
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
