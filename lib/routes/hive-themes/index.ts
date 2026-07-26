import { Router } from "express";
import { requireAuth } from "@/middleware/auth";
import { HiveThemesRoutes } from "@/routes/hive-themes/routes";

export class HiveThemesRouter {
  public router: Router;

  constructor() {
    this.router = Router();
    this.router.use(requireAuth);
    this.router.get("/", HiveThemesRoutes.list);
  }
}
