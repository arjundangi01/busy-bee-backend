import { NextFunction, Request, Response } from "express";
import httpStatus from "http-status";
import { SuccessResponse } from "@/utils/helpers/apiResponse";
import { MissionsHelpers } from "@/routes/missions/helpers";

export class MissionsRoutes {
  public static async plan(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await MissionsHelpers.plan(req.body);
      return SuccessResponse(res, httpStatus.OK, { message: "success", data });
    } catch (error) {
      next(error);
    }
  }

  public static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await MissionsHelpers.create(req.user!.id, req.body);
      return SuccessResponse(res, httpStatus.CREATED, { message: "Mission created", data });
    } catch (error) {
      next(error);
    }
  }

  public static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await MissionsHelpers.list(req.user!.id);
      return SuccessResponse(res, httpStatus.OK, { message: "success", data });
    } catch (error) {
      next(error);
    }
  }

  public static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await MissionsHelpers.getById(req.user!.id, req.params.missionId);
      return SuccessResponse(res, httpStatus.OK, { message: "success", data });
    } catch (error) {
      next(error);
    }
  }

  public static async completeTask(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await MissionsHelpers.completeTask(req.user!.id, req.params.missionId, req.params.taskId);
      return SuccessResponse(res, httpStatus.OK, { message: "Task completed", data });
    } catch (error) {
      next(error);
    }
  }

  public static async addTask(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await MissionsHelpers.addTask(req.user!.id, req.params.missionId, req.body);
      return SuccessResponse(res, httpStatus.CREATED, { message: "Task added", data });
    } catch (error) {
      next(error);
    }
  }

  public static async editTaskTitle(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await MissionsHelpers.editTaskTitle(req.user!.id, req.params.missionId, req.params.taskId, req.body);
      return SuccessResponse(res, httpStatus.OK, { message: "Task updated", data });
    } catch (error) {
      next(error);
    }
  }

  public static async reorderTasks(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await MissionsHelpers.reorderTasks(req.user!.id, req.params.missionId, req.body);
      return SuccessResponse(res, httpStatus.OK, { message: "success", data });
    } catch (error) {
      next(error);
    }
  }
}
