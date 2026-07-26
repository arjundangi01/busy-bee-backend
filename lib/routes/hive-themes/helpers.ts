import httpStatus from "http-status";
import { WorkTypeTier } from "@prisma/client";
import { prismaClient } from "@/db/db";
import { AppError } from "@/utils/helpers/appError";
import { isUserPro } from "@/utils/helpers/entitlement";
import { IHiveThemeDto } from "@/routes/hive-themes/utils/types";

export class HiveThemeHelpers {
  public static list = async (userId: string): Promise<IHiveThemeDto[]> => {
    const [themes, isPro] = await Promise.all([
      prismaClient.hiveTheme.findMany({ where: { isActive: true }, orderBy: { createdAt: "asc" } }),
      isUserPro(userId),
    ]);

    return themes.map((theme) => ({
      id: theme.id,
      key: theme.key,
      label: theme.label,
      tier: theme.tier,
      skyTop: theme.skyTop,
      skyBottom: theme.skyBottom,
      wallTop: theme.wallTop,
      wallBottom: theme.wallBottom,
      floorTop: theme.floorTop,
      floorBottom: theme.floorBottom,
      lanternGlow: theme.lanternGlow,
      locked: theme.tier === WorkTypeTier.PRO && !isPro,
    }));
  };

  // Shared by AuthHelpers.updatePreferences — same "must exist, must be
  // active, Pro needs Pro" rule WorkTypeHelpers.assertSelectable/
  // BeeSkinHelpers.assertSelectable enforce, kept in the module that owns
  // HiveTheme.
  public static assertSelectable = async (userId: string, themeId: string): Promise<void> => {
    const theme = await prismaClient.hiveTheme.findUnique({ where: { id: themeId } });
    if (!theme || !theme.isActive) {
      throw new AppError("Hive theme not found", httpStatus.NOT_FOUND);
    }
    if (theme.tier === WorkTypeTier.PRO && !(await isUserPro(userId))) {
      throw new AppError("This theme requires Pro", httpStatus.FORBIDDEN);
    }
  };
}
