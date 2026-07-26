import httpStatus from "http-status";
import { MissionStatus, Prisma, TaskStatus } from "@prisma/client";
import { prismaClient } from "@/db/db";
import { AppError } from "@/utils/helpers/appError";
import { isNonEmptyString } from "@/utils/helpers/common";
import { MissionPlannerService } from "@/services/ai/missionPlanner";
import {
  ICreateMissionPayload,
  IMissionDto,
  IMissionPlanDto,
  IPlanMissionPayload,
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

    const stepTitles = [payload.nextStep, ...payload.remainingSteps];

    const mission = await prismaClient.mission.create({
      data: {
        userId,
        title: payload.taskText.trim(),
        tasks: {
          // The first task (order 0) is the mission's active/next task from
          // the moment it's created — see MissionTask.startedAt's doc
          // comment in schema.prisma.
          create: stepTitles.map((title, index) => ({
            title,
            order: index,
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
