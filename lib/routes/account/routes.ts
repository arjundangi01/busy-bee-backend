import { NextFunction, Request, Response } from "express";
import httpStatus from "http-status";
import { SuccessResponse } from "@/utils/helpers/apiResponse";
import { AccountHelpers } from "@/routes/account/helpers";

// Same generic message on every call, whether or not the email matched an
// account — this is what makes delete-request non-enumerable.
const DELETE_REQUEST_MESSAGE = "If an account exists for that email, we've sent a confirmation link.";
const DELETED_MESSAGE = "Your account has been deleted.";

export class AccountRoutes {
  public static async deleteRequest(req: Request, res: Response, next: NextFunction) {
    try {
      await AccountHelpers.requestDeletion(req.body);
      return SuccessResponse(res, httpStatus.OK, { message: DELETE_REQUEST_MESSAGE });
    } catch (error) {
      next(error);
    }
  }

  public static async deleteConfirm(req: Request, res: Response, next: NextFunction) {
    try {
      await AccountHelpers.confirmDeletion(req.body);
      return SuccessResponse(res, httpStatus.OK, { message: DELETED_MESSAGE });
    } catch (error) {
      next(error);
    }
  }

  public static async deleteAccount(req: Request, res: Response, next: NextFunction) {
    try {
      await AccountHelpers.deleteAuthenticatedAccount(req.user!.id);
      return SuccessResponse(res, httpStatus.OK, { message: DELETED_MESSAGE });
    } catch (error) {
      next(error);
    }
  }
}
