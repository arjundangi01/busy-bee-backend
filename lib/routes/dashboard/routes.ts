import { NextFunction, Request, Response } from "express";
import httpStatus from "http-status";
import { SuccessResponse } from "@/utils/helpers/apiResponse";
import { DashboardHelpers } from "@/routes/dashboard/helpers";

export class DashboardRoutes {
  public static async get(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await DashboardHelpers.get(req.user!.id);
      return SuccessResponse(res, httpStatus.OK, { message: "success", data });
    } catch (error) {
      next(error);
    }
  }
}
