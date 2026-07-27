import { NextFunction, Request, Response } from "express";
import httpStatus from "http-status";
import { SuccessResponse } from "@/utils/helpers/apiResponse";
import { UsageStatsHelpers } from "@/routes/usage-stats/helpers";

export class UsageStatsRoutes {
  public static async ingestDaily(req: Request, res: Response, next: NextFunction) {
    try {
      await UsageStatsHelpers.ingestDaily(req.user!.id, req.body);
      return SuccessResponse(res, httpStatus.OK, { message: "success", data: null });
    } catch (error) {
      next(error);
    }
  }
}
