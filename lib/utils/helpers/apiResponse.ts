import { Response } from "express";

export const SuccessResponse = <T>(
  res: Response,
  statusCode: number,
  payload: { message: string; data?: T },
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
  payload: { message: string },
): Response => {
  return res.status(statusCode).json({
    success: false,
    message: payload.message,
  });
};
