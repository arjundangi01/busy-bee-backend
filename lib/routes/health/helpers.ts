import { HEALTH_STATUS } from "@/routes/health/utils/enums";

export class HealthHelpers {
  public static getStatus = async (): Promise<{ status: HEALTH_STATUS; timestamp: string }> => {
    return {
      status: HEALTH_STATUS.OK,
      timestamp: new Date().toISOString(),
    };
  };
}
