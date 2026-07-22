import { Response } from "express";
import { IApiSuccessPayload } from "@/utils/interfaces";

export const SuccessResponse = <T>(
  res: Response,
  statusCode: number,
  payload: IApiSuccessPayload<T>,
): Response => {
  return res.status(statusCode).json({
    success: true,
    message: payload.message,
    data: payload.data ?? null,
  });
};

export const ErrorResponse = (
  res: Response,
  statusCode: number,
  payload: { message: string; code?: string },
): Response => {
  return res.status(statusCode).json({
    success: false,
    message: payload.message,
    code: payload.code,
  });
};
