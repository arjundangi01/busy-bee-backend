import express, { Express, Request, Response } from "express";
import cors from "cors";
import httpStatus from "http-status";
import { ApiRouter } from "@/routes/api";
import { globalErrorHandler } from "@/middleware/globalErrorHandler";
import { ErrorResponse } from "@/utils/helpers/apiResponse";

export const createServer = (): Express => {
  const app = express();

  // Open CORS is fine for local scaffolding; tighten to an allowlist before deploying.
  app.use(cors());
  app.use(express.json());
  app.use("/api", new ApiRouter().router);
  app.use((_req: Request, res: Response) => {
    return ErrorResponse(res, httpStatus.NOT_FOUND, { message: "Not found" });
  });
  app.use(globalErrorHandler);

  return app;
};
