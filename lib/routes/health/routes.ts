import { NextFunction, Request, Response } from "express";
import httpStatus from "http-status";
import { SuccessResponse } from "@/utils/helpers/apiResponse";
import { HealthHelpers } from "@/routes/health/helpers";

export class HealthRoutes {
  public static async getStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await HealthHelpers.getStatus();
      return SuccessResponse(res, httpStatus.OK, { message: "success", data });
    } catch (error) {
      next(error);
    }
  }
}
