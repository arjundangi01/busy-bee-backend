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
  // True while this mission has a real, unended FocusSession — task editing
  // (add/rename/reorder) is blocked server-side while this is true, so the
  // client can proactively lock the same controls instead of only failing
  // reactively after a request.
  hasActiveSession: boolean;
};

export type IMissionPlanDto = {
  nextStep: string;
  nextStepMinutes: number;
  remainingSteps: string[];
  remainingStepsMinutes: number[];
  estimatedMinutes: number;
};

export type IPlanMissionPayload = {
  taskText: string;
};

export type ICreateMissionPayload = {
  taskText: string;
  nextStep: string;
  nextStepMinutes: number;
  remainingSteps: string[];
  remainingStepsMinutes: number[];
  focusMinutes: number;
};

export type IAddTaskPayload = {
  title: string;
  estimatedMinutes: number;
};

export type IEditTaskTitlePayload = {
  title: string;
};

export type IReorderTasksPayload = {
  taskIds: string[];
};
