import { Router } from "express";
import { requireAuth } from "@/middleware/auth";
import { AccountRoutes } from "@/routes/account/routes";

export class AccountRouter {
  public router: Router;

  constructor() {
    this.router = Router();
    // Public — no account exists to authenticate against until the token is
    // redeemed (delete-request) or has just deleted it (delete-confirm).
    this.router.post("/delete-request", AccountRoutes.deleteRequest);
    this.router.post("/delete-confirm", AccountRoutes.deleteConfirm);
    // Authenticated in-app path — uses the caller's own session, no token.
    this.router.delete("/", requireAuth, AccountRoutes.deleteAccount);
  }
}
