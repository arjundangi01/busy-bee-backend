import { Router } from "express";
import { HealthRoutes } from "@/routes/health/routes";

export class HealthRouter {
  public router: Router;

  constructor() {
    this.router = Router();
    this.router.get("/", HealthRoutes.getStatus);
  }
}
