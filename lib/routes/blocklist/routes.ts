import { NextFunction, Request, Response } from "express";
import httpStatus from "http-status";
import { SuccessResponse } from "@/utils/helpers/apiResponse";
import { BlocklistHelpers } from "@/routes/blocklist/helpers";

export class BlocklistRoutes {
  public static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await BlocklistHelpers.list(req.user!.id);
      return SuccessResponse(res, httpStatus.OK, { message: "success", data });
    } catch (error) {
      next(error);
    }
  }

  public static async add(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await BlocklistHelpers.add(req.user!.id, req.body);
      return SuccessResponse(res, httpStatus.CREATED, { message: "App blocked", data });
    } catch (error) {
      next(error);
    }
  }

  public static async remove(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await BlocklistHelpers.remove(req.user!.id, req.params.packageName);
      return SuccessResponse(res, httpStatus.OK, { message: "App unblocked", data });
    } catch (error) {
      next(error);
    }
  }

  public static async seedDefaults(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await BlocklistHelpers.seedDefaults(req.user!.id, req.body);
      return SuccessResponse(res, httpStatus.OK, { message: "success", data });
    } catch (error) {
      next(error);
    }
  }
}
