import { Router } from "express";
import { requireAuth } from "@/middleware/auth";
import { AuthRoutes } from "@/routes/auth/routes";

export class AuthRouter {
  public router: Router;

  constructor() {
    this.router = Router();
    this.router.post("/sign-up", AuthRoutes.signUp);
    this.router.post("/sign-in", AuthRoutes.signIn);
    this.router.get("/me", requireAuth, AuthRoutes.me);
  }
}
