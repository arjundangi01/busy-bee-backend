import { NextFunction, Request, Response } from "express";
import httpStatus from "http-status";
import { AppError } from "@/utils/helpers/appError";
import { ErrorResponse } from "@/utils/helpers/apiResponse";

export const globalErrorHandler = (
  error: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): Response => {
  if (error instanceof AppError) {
    return ErrorResponse(res, error.statusCode, { message: error.message, code: error.code });
  }

  return ErrorResponse(res, httpStatus.INTERNAL_SERVER_ERROR, {
    message: "Something went wrong",
  });
};
