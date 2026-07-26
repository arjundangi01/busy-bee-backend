import { NextFunction, Request, Response } from "express";
import httpStatus from "http-status";
import { SuccessResponse } from "@/utils/helpers/apiResponse";
import { FocusSessionsHelpers } from "@/routes/focus-sessions/helpers";

export class FocusSessionsRoutes {
  public static async start(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await FocusSessionsHelpers.start(req.user!.id, req.body);
      return SuccessResponse(res, httpStatus.CREATED, { message: "Focus session started", data });
    } catch (error) {
      next(error);
    }
  }

  public static async getActive(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await FocusSessionsHelpers.getActive(req.user!.id);
      return SuccessResponse(res, httpStatus.OK, { message: "success", data });
    } catch (error) {
      next(error);
    }
  }

  public static async recordBlockedAttempt(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await FocusSessionsHelpers.recordBlockedAttempt(
        req.user!.id,
        req.params.focusSessionId,
        req.body ?? {},
      );
      return SuccessResponse(res, httpStatus.OK, { message: "success", data });
    } catch (error) {
      next(error);
    }
  }

  public static async end(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await FocusSessionsHelpers.end(req.user!.id, req.params.focusSessionId, req.body);
      return SuccessResponse(res, httpStatus.OK, { message: "Focus session ended", data });
    } catch (error) {
      next(error);
    }
  }
}
