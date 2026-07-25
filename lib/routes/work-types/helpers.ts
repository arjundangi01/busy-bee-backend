import httpStatus from "http-status";
import { WorkTypeTier } from "@prisma/client";
import { prismaClient } from "@/db/db";
import { AppError } from "@/utils/helpers/appError";
import { isUserPro } from "@/utils/helpers/entitlement";
import { IBankedWorkDto, IWorkTypeDto } from "@/routes/work-types/utils/types";

export class WorkTypeHelpers {
  public static list = async (userId: string): Promise<IWorkTypeDto[]> => {
    const [workTypes, isPro] = await Promise.all([
      prismaClient.workType.findMany({ where: { isActive: true }, orderBy: { createdAt: "asc" } }),
      isUserPro(userId),
    ]);

    return workTypes.map((workType) => ({
      id: workType.id,
      key: workType.key,
      label: workType.label,
      tier: workType.tier,
      totalUnits: workType.totalUnits,
      locked: workType.tier === WorkTypeTier.PRO && !isPro,
    }));
  };

  // Aggregates real, server-computed workUnitsCompleted across every one of
  // the user's sessions — this is the Hive gallery's data source, not a
  // separate banked-work ledger, so it can never drift from what
  // FocusSessionsHelpers.end actually persisted.
  public static getBanked = async (userId: string): Promise<IBankedWorkDto[]> => {
    const grouped = await prismaClient.focusSession.groupBy({
      by: ["workTypeId"],
      where: { mission: { userId }, workTypeId: { not: null } },
      _sum: { workUnitsCompleted: true },
    });

    if (grouped.length === 0) return [];

    const workTypes = await prismaClient.workType.findMany({
      where: { id: { in: grouped.map((g) => g.workTypeId as string) } },
    });
    const workTypeById = new Map(workTypes.map((workType) => [workType.id, workType]));

    return grouped
      .map((group) => {
        const workType = workTypeById.get(group.workTypeId as string);
        if (!workType) return null;
        return {
          workTypeId: workType.id,
          key: workType.key,
          label: workType.label,
          totalUnitsCompleted: group._sum.workUnitsCompleted ?? 0,
        };
      })
      .filter((dto): dto is IBankedWorkDto => dto !== null);
  };

  // Shared by AuthHelpers.updatePreferences (the actual selection endpoint —
  // see 05-bees-hive.md) so the domain rule "must exist, must be active, Pro
  // types need Pro" lives once, in the module that owns WorkType, rather
  // than being re-implemented inside the auth module.
  public static assertSelectable = async (userId: string, workTypeId: string): Promise<void> => {
    const workType = await prismaClient.workType.findUnique({ where: { id: workTypeId } });
    if (!workType || !workType.isActive) {
      throw new AppError("Work type not found", httpStatus.NOT_FOUND);
    }
    if (workType.tier === WorkTypeTier.PRO && !(await isUserPro(userId))) {
      throw new AppError("This work type requires Pro", httpStatus.FORBIDDEN);
    }
  };
}
