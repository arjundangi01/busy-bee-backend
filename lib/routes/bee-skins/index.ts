import { Router } from "express";
import { requireAuth } from "@/middleware/auth";
import { BeeSkinsRoutes } from "@/routes/bee-skins/routes";

export class BeeSkinsRouter {
  public router: Router;

  constructor() {
    this.router = Router();
    this.router.use(requireAuth);
    this.router.get("/", BeeSkinsRoutes.list);
  }
}
