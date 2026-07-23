import { NextFunction, Request, Response } from "express";
import httpStatus from "http-status";
import { SuccessResponse } from "@/utils/helpers/apiResponse";
import { AuthHelpers } from "@/routes/auth/helpers";

export class AuthRoutes {
  public static async signUp(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await AuthHelpers.signUp(req.body);
      return SuccessResponse(res, httpStatus.CREATED, {
        message: "Account created",
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async signIn(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await AuthHelpers.signIn(req.body);
      return SuccessResponse(res, httpStatus.OK, {
        message: "Signed in",
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async google(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await AuthHelpers.signInWithGoogle(req.body);
      return SuccessResponse(res, httpStatus.OK, {
        message: "Signed in with Google",
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async me(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await AuthHelpers.getMe(req.user!.id);
      return SuccessResponse(res, httpStatus.OK, { message: "success", data });
    } catch (error) {
      next(error);
    }
  }
}
