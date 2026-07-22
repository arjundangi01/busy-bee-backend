import { Router } from "express";
import { requireAuth } from "@/middleware/auth";
import { DashboardRoutes } from "@/routes/dashboard/routes";

export class DashboardRouter {
  public router: Router;

  constructor() {
    this.router = Router();
    this.router.use(requireAuth);
    this.router.get("/", DashboardRoutes.get);
  }
}
