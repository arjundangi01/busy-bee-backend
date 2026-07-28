import { Router } from "express";
import { requireAuth } from "@/middleware/auth";
import { MissionsRoutes } from "@/routes/missions/routes";

export class MissionsRouter {
  public router: Router;

  constructor() {
    this.router = Router();
    this.router.use(requireAuth);
    this.router.post("/plan", MissionsRoutes.plan);
    this.router.post("/", MissionsRoutes.create);
    this.router.get("/", MissionsRoutes.list);
    this.router.get("/:missionId", MissionsRoutes.getById);
    this.router.post("/:missionId/tasks/:taskId/complete", MissionsRoutes.completeTask);
    this.router.post("/:missionId/tasks", MissionsRoutes.addTask);
    // Must be registered before the ":taskId" PATCH route below — otherwise
    // Express matches "/tasks/reorder" against "/tasks/:taskId" first,
    // treating "reorder" as a task id.
    this.router.patch("/:missionId/tasks/reorder", MissionsRoutes.reorderTasks);
    this.router.patch("/:missionId/tasks/:taskId", MissionsRoutes.editTaskTitle);
  }
}
