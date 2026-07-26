import { WorkTypeTier } from "@prisma/client";

export type IBeeSkinDto = {
  id: string;
  key: string;
  label: string;
  tier: WorkTypeTier;
  bodyPrimary: string;
  bodySecondary: string;
  stripe: string;
  // Same convention as IWorkTypeDto.locked — Pro-tier skins are shown with
  // a lock affordance rather than filtered out, so a Free user can see
  // what Pro unlocks.
  locked: boolean;
};
