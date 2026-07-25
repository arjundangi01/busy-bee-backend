import { Router } from "express";
import { requireAuth } from "@/middleware/auth";
import { WorkTypesRoutes } from "@/routes/work-types/routes";

export class WorkTypesRouter {
  public router: Router;

  constructor() {
    this.router = Router();
    this.router.use(requireAuth);
    this.router.get("/", WorkTypesRoutes.list);
    this.router.get("/banked", WorkTypesRoutes.banked);
  }
}
