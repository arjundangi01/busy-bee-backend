import { NextFunction, Request, Response } from "express";
import httpStatus from "http-status";
import { SuccessResponse } from "@/utils/helpers/apiResponse";
import { SubscriptionHelpers } from "@/routes/subscription/helpers";

export class SubscriptionRoutes {
  public static async getStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await SubscriptionHelpers.getStatus(req.user!.id);
      return SuccessResponse(res, httpStatus.OK, { message: "success", data });
    } catch (error) {
      next(error);
    }
  }
}
