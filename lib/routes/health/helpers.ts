export class HealthHelpers {
  public static getStatus = async (): Promise<{ status: string; timestamp: string }> => {
    return {
      status: "ok",
      timestamp: new Date().toISOString(),
    };
  };
}
