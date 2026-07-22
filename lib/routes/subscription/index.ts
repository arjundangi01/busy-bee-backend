import { Router } from "express";
import { requireAuth } from "@/middleware/auth";
import { SubscriptionRoutes } from "@/routes/subscription/routes";

export class SubscriptionRouter {
  public router: Router;

  constructor() {
    this.router = Router();
    this.router.use(requireAuth);
    this.router.get("/status", SubscriptionRoutes.getStatus);
  }
}
