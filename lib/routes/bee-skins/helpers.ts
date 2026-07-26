import httpStatus from "http-status";
import { WorkTypeTier } from "@prisma/client";
import { prismaClient } from "@/db/db";
import { AppError } from "@/utils/helpers/appError";
import { isUserPro } from "@/utils/helpers/entitlement";
import { IBeeSkinDto } from "@/routes/bee-skins/utils/types";

export class BeeSkinHelpers {
  public static list = async (userId: string): Promise<IBeeSkinDto[]> => {
    const [skins, isPro] = await Promise.all([
      prismaClient.beeSkin.findMany({ where: { isActive: true }, orderBy: { createdAt: "asc" } }),
      isUserPro(userId),
    ]);

    return skins.map((skin) => ({
      id: skin.id,
      key: skin.key,
      label: skin.label,
      tier: skin.tier,
      bodyPrimary: skin.bodyPrimary,
      bodySecondary: skin.bodySecondary,
      stripe: skin.stripe,
      locked: skin.tier === WorkTypeTier.PRO && !isPro,
    }));
  };

  // Shared by AuthHelpers.updatePreferences — same "must exist, must be
  // active, Pro needs Pro" rule WorkTypeHelpers.assertSelectable enforces
  // for work-type selection, kept in the module that owns BeeSkin.
  public static assertSelectable = async (userId: string, skinId: string): Promise<void> => {
    const skin = await prismaClient.beeSkin.findUnique({ where: { id: skinId } });
    if (!skin || !skin.isActive) {
      throw new AppError("Bee skin not found", httpStatus.NOT_FOUND);
    }
    if (skin.tier === WorkTypeTier.PRO && !(await isUserPro(userId))) {
      throw new AppError("This appearance requires Pro", httpStatus.FORBIDDEN);
    }
  };
}
