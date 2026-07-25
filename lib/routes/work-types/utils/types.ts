import { WorkTypeTier } from "@prisma/client";

export type IWorkTypeDto = {
  id: string;
  key: string;
  label: string;
  tier: WorkTypeTier;
  totalUnits: number;
  // True when tier is PRO and the requesting user isn't entitled — the
  // client shows these with a lock affordance rather than filtering them
  // out entirely, so a Free user can see what Pro unlocks.
  locked: boolean;
};

export type IBankedWorkDto = {
  workTypeId: string;
  key: string;
  label: string;
  totalUnitsCompleted: number;
};
