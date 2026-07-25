import { NextFunction, Request, Response } from "express";
import httpStatus from "http-status";
import { SuccessResponse } from "@/utils/helpers/apiResponse";
import { WorkTypeHelpers } from "@/routes/work-types/helpers";

export class WorkTypesRoutes {
  public static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await WorkTypeHelpers.list(req.user!.id);
      return SuccessResponse(res, httpStatus.OK, { message: "success", data });
    } catch (error) {
      next(error);
    }
  }

  public static async banked(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await WorkTypeHelpers.getBanked(req.user!.id);
      return SuccessResponse(res, httpStatus.OK, { message: "success", data });
    } catch (error) {
      next(error);
    }
  }
}
