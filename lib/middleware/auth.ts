import { NextFunction, Request, Response } from "express";
import httpStatus from "http-status";
import { prismaClient } from "@/db/db";
import { ErrorResponse } from "@/utils/helpers/apiResponse";
import { verifySessionToken } from "@/utils/helpers/sessionToken";

export const requireAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : null;

  if (!token) {
    ErrorResponse(res, httpStatus.UNAUTHORIZED, { message: "Authentication required" });
    return;
  }

  const payload = verifySessionToken(token);
  if (!payload) {
    ErrorResponse(res, httpStatus.UNAUTHORIZED, { message: "Invalid or expired session" });
    return;
  }

  try {
    const user = await prismaClient.user.findUnique({ where: { id: payload.userId } });
    if (!user) {
      ErrorResponse(res, httpStatus.UNAUTHORIZED, { message: "Invalid or expired session" });
      return;
    }

    req.user = { id: user.id, name: user.name, email: user.email };
    next();
  } catch (error) {
    next(error);
  }
};
