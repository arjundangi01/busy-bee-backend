import { Router } from "express";
import { HealthRouter } from "@/routes/health";
import { AuthRouter } from "@/routes/auth";
import { MissionsRouter } from "@/routes/missions";
import { DashboardRouter } from "@/routes/dashboard";
import { FocusSessionsRouter } from "@/routes/focus-sessions";
import { ProgressRouter } from "@/routes/progress";
import { SubscriptionRouter } from "@/routes/subscription";
import { WebhooksRouter } from "@/routes/webhooks";
import { BlocklistRouter } from "@/routes/blocklist";

export class ApiRouter {
  public router: Router;

  constructor() {
    this.router = Router();
    this.router.use("/health", new HealthRouter().router);
    this.router.use("/auth", new AuthRouter().router);
    this.router.use("/missions", new MissionsRouter().router);
    this.router.use("/dashboard", new DashboardRouter().router);
    this.router.use("/focus-sessions", new FocusSessionsRouter().router);
    this.router.use("/progress", new ProgressRouter().router);
    this.router.use("/subscription", new SubscriptionRouter().router);
    this.router.use("/webhooks", new WebhooksRouter().router);
    this.router.use("/blocklist", new BlocklistRouter().router);
  }
}
