import { Router } from "express";
import { requireAuth } from "@/middleware/auth";
import { FocusSessionsRoutes } from "@/routes/focus-sessions/routes";

export class FocusSessionsRouter {
  public router: Router;

  constructor() {
    this.router = Router();
    this.router.use(requireAuth);
    this.router.post("/", FocusSessionsRoutes.start);
    this.router.post("/:focusSessionId/blocked-attempt", FocusSessionsRoutes.recordBlockedAttempt);
    this.router.post("/:focusSessionId/end", FocusSessionsRoutes.end);
  }
}
