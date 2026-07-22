import { NextFunction, Request, Response } from "express";
import httpStatus from "http-status";
import { SuccessResponse } from "@/utils/helpers/apiResponse";
import { WebhooksHelpers } from "@/routes/webhooks/helpers";

export class WebhooksRoutes {
  public static async revenueCat(req: Request, res: Response, next: NextFunction) {
    try {
      await WebhooksHelpers.handleRevenueCat(req.body);
      return SuccessResponse(res, httpStatus.OK, { message: "ok" });
    } catch (error) {
      next(error);
    }
  }
}
