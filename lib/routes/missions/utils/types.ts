import { MissionStatus, TaskStatus } from "@prisma/client";

export type IMissionTaskDto = {
  id: string;
  title: string;
  order: number;
  estimatedMinutes: number | null;
  status: TaskStatus;
};

export type IMissionDto = {
  id: string;
  title: string;
  status: MissionStatus;
  estimatedMinutes: number | null;
  progressPercent: number;
  tasks: IMissionTaskDto[];
  nextTask: IMissionTaskDto | null;
};

export type IMissionPlanDto = {
  nextStep: string;
  remainingSteps: string[];
};

export type IPlanMissionPayload = {
  taskText: string;
};

export type ICreateMissionPayload = {
  taskText: string;
  nextStep: string;
  remainingSteps: string[];
};
