import httpStatus from "http-status";
import { MissionStatus, Prisma, TaskStatus } from "@prisma/client";
import { prismaClient } from "@/db/db";
import { AppError } from "@/utils/helpers/appError";
import { isNonEmptyString } from "@/utils/helpers/common";
import { getPlanLimitsForUser } from "@/utils/helpers/entitlement";
import { MissionPlannerService } from "@/services/ai/missionPlanner";
import { MissionErrorCode } from "@/routes/missions/utils/enums";
import {
  IAddTaskPayload,
  ICreateMissionPayload,
  IEditTaskTitlePayload,
  IMissionDto,
  IMissionPlanDto,
  IPlanMissionPayload,
  IReorderTasksPayload,
} from "@/routes/missions/utils/types";

type IMissionWithTasks = Prisma.MissionGetPayload<{ include: { tasks: true } }>;

export class MissionsHelpers {
  public static plan = async (payload: IPlanMissionPayload): Promise<IMissionPlanDto> => {
    if (!isNonEmptyString(payload.taskText)) {
      throw new AppError("A task is required", httpStatus.BAD_REQUEST);
    }

    return MissionPlannerService.breakdown(payload.taskText.trim());
  };

  public static create = async (
    userId: string,
    payload: ICreateMissionPayload,
  ): Promise<IMissionDto> => {
    if (!isNonEmptyString(payload.taskText) || !isNonEmptyString(payload.nextStep)) {
      throw new AppError("A task and next step are required", httpStatus.BAD_REQUEST);
    }
    if (!Number.isFinite(payload.focusMinutes) || payload.focusMinutes <= 0) {
      throw new AppError("A valid focus duration is required", httpStatus.BAD_REQUEST);
    }
    if (
      !Number.isFinite(payload.nextStepMinutes) ||
      payload.nextStepMinutes <= 0 ||
      payload.remainingSteps.length !== payload.remainingStepsMinutes.length ||
      payload.remainingStepsMinutes.some((minutes) => !Number.isFinite(minutes) || minutes <= 0)
    ) {
      throw new AppError("A valid per-step time estimate is required for every step", httpStatus.BAD_REQUEST);
    }

    const stepTitles = [payload.nextStep, ...payload.remainingSteps];
    const stepMinutes = [payload.nextStepMinutes, ...payload.remainingStepsMinutes];

    // The client's chosen duration is clamped server-side to the caller's
    // plan cap — same "never trust the client" rule focus-sessions applies
    // to elapsed time, applied here to the duration they're allowed to pick.
    const limits = await getPlanLimitsForUser(userId);
    const capMinutes =
      limits.sessionDurationCapSeconds !== null ? Math.floor(limits.sessionDurationCapSeconds / 60) : null;
    const requestedMinutes = Math.round(payload.focusMinutes);
    const estimatedMinutes = Math.max(
      1,
      capMinutes !== null ? Math.min(requestedMinutes, capMinutes) : requestedMinutes,
    );

    const mission = await prismaClient.mission.create({
      data: {
        userId,
        title: payload.taskText.trim(),
        estimatedMinutes,
        tasks: {
          // The first task (order 0) is the mission's active/next task from
          // the moment it's created — see MissionTask.startedAt's doc
          // comment in schema.prisma.
          create: stepTitles.map((title, index) => ({
            title,
            order: index,
            estimatedMinutes: Math.round(stepMinutes[index]),
            startedAt: index === 0 ? new Date() : null,
          })),
        },
      },
      include: { tasks: { orderBy: { order: "asc" } } },
    });

    return MissionsHelpers.toDto(mission);
  };

  public static list = async (userId: string): Promise<IMissionDto[]> => {
    const missions = await prismaClient.mission.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
      include: { tasks: { orderBy: { order: "asc" } } },
    });

    return missions.map(MissionsHelpers.toDto);
  };

  public static getById = async (userId: string, missionId: string): Promise<IMissionDto> => {
    const mission = await MissionsHelpers.findOwnedMission(userId, missionId);
    return MissionsHelpers.toDto(mission);
  };

  public static completeTask = async (
    userId: string,
    missionId: string,
    taskId: string,
  ): Promise<IMissionDto> => {
    const mission = await MissionsHelpers.findOwnedMission(userId, missionId);
    const task = mission.tasks.find((item) => item.id === taskId);
    if (!task) {
      throw new AppError("Task not found", httpStatus.NOT_FOUND);
    }

    if (task.status !== TaskStatus.DONE) {
      await prismaClient.missionTask.update({
        where: { id: taskId },
        data: { status: TaskStatus.DONE, completedAt: new Date() },
      });
    }

    const refreshedMission = await MissionsHelpers.findOwnedMission(userId, missionId);

    // The task that just became this mission's new active/next task starts
    // its own clock now, same as the first task did at mission creation.
    const newNextTask = refreshedMission.tasks.find((item) => item.status !== TaskStatus.DONE) ?? null;
    if (newNextTask && newNextTask.startedAt === null) {
      await prismaClient.missionTask.update({
        where: { id: newNextTask.id },
        data: { startedAt: new Date() },
      });
    }

    const allTasksDone = refreshedMission.tasks.every((item) => item.status === TaskStatus.DONE);

    if (allTasksDone && refreshedMission.status !== MissionStatus.COMPLETED) {
      await prismaClient.mission.update({
        where: { id: missionId },
        data: { status: MissionStatus.COMPLETED, completedAt: new Date() },
      });
      return MissionsHelpers.toDto(await MissionsHelpers.findOwnedMission(userId, missionId));
    }

    return MissionsHelpers.toDto(refreshedMission);
  };

  // Free-tier caps are only enforced here — the AI's initial breakdown is
  // never blocked or told to stay under either limit, per the product
  // decision this feature shipped under. Both caps are config rows
  // (PlanLimits), not hardcoded, same as the existing session-cadence caps.
  public static addTask = async (
    userId: string,
    missionId: string,
    payload: IAddTaskPayload,
  ): Promise<IMissionDto> => {
    if (!isNonEmptyString(payload.title)) {
      throw new AppError("A task title is required", httpStatus.BAD_REQUEST);
    }
    if (!Number.isFinite(payload.estimatedMinutes) || payload.estimatedMinutes <= 0) {
      throw new AppError("A valid time estimate is required", httpStatus.BAD_REQUEST);
    }

    const mission = await MissionsHelpers.findOwnedMission(userId, missionId);
    const limits = await getPlanLimitsForUser(userId);

    if (limits.maxTasksPerMission !== null && mission.tasks.length >= limits.maxTasksPerMission) {
      throw new AppError(
        "This mission has reached its free task limit",
        httpStatus.FORBIDDEN,
        MissionErrorCode.TASK_LIMIT_REACHED,
      );
    }

    // Any pre-existing task without a real estimate (created before this
    // feature shipped) counts as 0 toward the budget rather than blocking
    // the check entirely.
    const currentTotalMinutes = mission.tasks.reduce((sum, task) => sum + (task.estimatedMinutes ?? 0), 0);
    const requestedMinutes = Math.round(payload.estimatedMinutes);
    if (limits.maxMissionMinutes !== null && currentTotalMinutes + requestedMinutes > limits.maxMissionMinutes) {
      throw new AppError(
        "This mission has reached its free time budget",
        httpStatus.FORBIDDEN,
        MissionErrorCode.TIME_BUDGET_EXCEEDED,
      );
    }

    const nextOrder = mission.tasks.length === 0 ? 0 : Math.max(...mission.tasks.map((task) => task.order)) + 1;
    // Mirrors MissionTask.startedAt's activation rule elsewhere in this
    // file: a task starts its own clock the moment it becomes the mission's
    // active/next task — which a newly-added task immediately is, if every
    // existing task was already done (i.e. this mission had been sitting
    // complete and just gained new work).
    const becomesActiveNow = mission.tasks.every((task) => task.status === TaskStatus.DONE);

    await prismaClient.$transaction(async (tx) => {
      await tx.missionTask.create({
        data: {
          missionId,
          title: payload.title.trim(),
          order: nextOrder,
          estimatedMinutes: requestedMinutes,
          startedAt: becomesActiveNow ? new Date() : null,
        },
      });

      if (becomesActiveNow && mission.status === MissionStatus.COMPLETED) {
        await tx.mission.update({
          where: { id: missionId },
          data: { status: MissionStatus.ACTIVE, completedAt: null },
        });
      }
    });

    return MissionsHelpers.toDto(await MissionsHelpers.findOwnedMission(userId, missionId));
  };

  // Always free — no tier gating. Fixing up the AI's own wording is never a
  // Pro-gated action, only adding capacity past a cap is.
  public static editTaskTitle = async (
    userId: string,
    missionId: string,
    taskId: string,
    payload: IEditTaskTitlePayload,
  ): Promise<IMissionDto> => {
    if (!isNonEmptyString(payload.title)) {
      throw new AppError("A task title is required", httpStatus.BAD_REQUEST);
    }

    const mission = await MissionsHelpers.findOwnedMission(userId, missionId);
    const task = mission.tasks.find((item) => item.id === taskId);
    if (!task) {
      throw new AppError("Task not found", httpStatus.NOT_FOUND);
    }

    await prismaClient.missionTask.update({
      where: { id: taskId },
      data: { title: payload.title.trim() },
    });

    return MissionsHelpers.toDto(await MissionsHelpers.findOwnedMission(userId, missionId));
  };

  // Always free — no tier gating, same reasoning as editTaskTitle.
  public static reorderTasks = async (
    userId: string,
    missionId: string,
    payload: IReorderTasksPayload,
  ): Promise<IMissionDto> => {
    const mission = await MissionsHelpers.findOwnedMission(userId, missionId);

    const currentIds = new Set(mission.tasks.map((task) => task.id));
    const providedIds = payload.taskIds;
    const isValidPermutation =
      Array.isArray(providedIds) &&
      providedIds.length === mission.tasks.length &&
      new Set(providedIds).size === providedIds.length &&
      providedIds.every((id) => currentIds.has(id));

    if (!isValidPermutation) {
      throw new AppError(
        "The reordered task list must match the mission's existing tasks exactly",
        httpStatus.BAD_REQUEST,
      );
    }

    await prismaClient.$transaction(
      providedIds.map((id, index) => prismaClient.missionTask.update({ where: { id }, data: { order: index } })),
    );

    return MissionsHelpers.toDto(await MissionsHelpers.findOwnedMission(userId, missionId));
  };

  private static findOwnedMission = async (userId: string, missionId: string): Promise<IMissionWithTasks> => {
    const mission = await prismaClient.mission.findFirst({
      where: { id: missionId, userId },
      include: { tasks: { orderBy: { order: "asc" } } },
    });

    if (!mission) {
      throw new AppError("Mission not found", httpStatus.NOT_FOUND);
    }

    return mission;
  };

  private static toDto = (mission: IMissionWithTasks): IMissionDto => {
    const doneCount = mission.tasks.filter((task) => task.status === TaskStatus.DONE).length;
    const progressPercent =
      mission.tasks.length === 0 ? 0 : Math.round((doneCount / mission.tasks.length) * 100);
    const nextTask = mission.tasks.find((task) => task.status !== TaskStatus.DONE) ?? null;

    return {
      id: mission.id,
      title: mission.title,
      status: mission.status,
      estimatedMinutes: mission.estimatedMinutes,
      progressPercent,
      tasks: mission.tasks,
      nextTask,
    };
  };
}
