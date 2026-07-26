import { WorkTypeTier } from "@prisma/client";

export type IHiveThemeDto = {
  id: string;
  key: string;
  label: string;
  tier: WorkTypeTier;
  skyTop: string;
  skyBottom: string;
  wallTop: string;
  wallBottom: string;
  floorTop: string;
  floorBottom: string;
  lanternGlow: string;
  // Same convention as IBeeSkinDto.locked — Pro-tier themes are shown with
  // a lock affordance rather than filtered out, so a Free user can see
  // what Pro unlocks.
  locked: boolean;
};
