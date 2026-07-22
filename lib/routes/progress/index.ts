import { Router } from "express";
import { requireAuth } from "@/middleware/auth";
import { ProgressRoutes } from "@/routes/progress/routes";

export class ProgressRouter {
  public router: Router;

  constructor() {
    this.router = Router();
    this.router.use(requireAuth);
    this.router.get("/", ProgressRoutes.get);
  }
}
