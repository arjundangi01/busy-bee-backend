import express, { Express } from "express";
import cors from "cors";
import { ApiRouter } from "@/routes/api";
import { globalErrorHandler } from "@/middleware/globalErrorHandler";

export const createServer = (): Express => {
  const app = express();

  app.use(cors());
  app.use(express.json());
  app.use("/api", new ApiRouter().router);
  app.use(globalErrorHandler);

  return app;
};
