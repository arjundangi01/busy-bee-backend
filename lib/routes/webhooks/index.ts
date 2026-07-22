import { NextFunction, Request, Response, Router } from "express";
import httpStatus from "http-status";
import { env } from "@/utils/configuration/env";
import { ErrorResponse } from "@/utils/helpers/apiResponse";
import { WebhooksRoutes } from "@/routes/webhooks/routes";

// RevenueCat authenticates its own webhook calls with a shared secret
// (configured as an "Authorization Header" value in the RevenueCat dashboard),
// not our normal user session token — this is not the requireAuth middleware.
const requireRevenueCatSecret = (req: Request, res: Response, next: NextFunction): void => {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : null;

  if (!env.revenueCatWebhookSecret || token !== env.revenueCatWebhookSecret) {
    ErrorResponse(res, httpStatus.UNAUTHORIZED, { message: "Invalid webhook credentials" });
    return;
  }
  next();
};

export class WebhooksRouter {
  public router: Router;

  constructor() {
    this.router = Router();
    this.router.post("/revenuecat", requireRevenueCatSecret, WebhooksRoutes.revenueCat);
  }
}
