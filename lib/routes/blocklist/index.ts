import { Router } from "express";
import { requireAuth } from "@/middleware/auth";
import { BlocklistRoutes } from "@/routes/blocklist/routes";

export class BlocklistRouter {
  public router: Router;

  constructor() {
    this.router = Router();
    this.router.use(requireAuth);
    this.router.get("/", BlocklistRoutes.list);
    this.router.post("/", BlocklistRoutes.add);
    this.router.post("/seed-defaults", BlocklistRoutes.seedDefaults);
    this.router.delete("/:packageName", BlocklistRoutes.remove);
  }
}
