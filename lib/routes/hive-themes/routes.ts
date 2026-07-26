import { NextFunction, Request, Response } from "express";
import httpStatus from "http-status";
import { SuccessResponse } from "@/utils/helpers/apiResponse";
import { HiveThemeHelpers } from "@/routes/hive-themes/helpers";

export class HiveThemesRoutes {
  public static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await HiveThemeHelpers.list(req.user!.id);
      return SuccessResponse(res, httpStatus.OK, { message: "success", data });
    } catch (error) {
      next(error);
    }
  }
}
