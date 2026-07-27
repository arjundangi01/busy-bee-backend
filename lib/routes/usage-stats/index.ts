import { Router } from "express";
import { requireAuth } from "@/middleware/auth";
import { UsageStatsRoutes } from "@/routes/usage-stats/routes";

export class UsageStatsRouter {
  public router: Router;

  constructor() {
    this.router = Router();
    this.router.use(requireAuth);
    this.router.post("/daily", UsageStatsRoutes.ingestDaily);
  }
}
