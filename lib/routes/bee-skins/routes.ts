import { NextFunction, Request, Response } from "express";
import httpStatus from "http-status";
import { SuccessResponse } from "@/utils/helpers/apiResponse";
import { BeeSkinHelpers } from "@/routes/bee-skins/helpers";

export class BeeSkinsRoutes {
  public static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await BeeSkinHelpers.list(req.user!.id);
      return SuccessResponse(res, httpStatus.OK, { message: "success", data });
    } catch (error) {
      next(error);
    }
  }
}
