import { Router } from "express";
import { HealthRouter } from "@/routes/health";

export class ApiRouter {
  public router: Router;

  constructor() {
    this.router = Router();
    this.router.use("/health", new HealthRouter().router);
  }
}
