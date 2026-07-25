import httpStatus from "http-status";
import { BlockedApp } from "@prisma/client";
import { prismaClient } from "@/db/db";
import { AppError } from "@/utils/helpers/appError";
import { isNonEmptyString } from "@/utils/helpers/common";
import {
  IAddBlockedAppPayload,
  IBlockedAppDto,
  ISeedBlocklistDefaultsPayload,
} from "@/routes/blocklist/utils/types";

const MAX_FIELD_LENGTH = 200;
const MAX_SEED_DEFAULTS_LENGTH = 20;

// Guards against non-object bodies (null, a bare string/number, etc.) before
// any property access — payload.packageName on a null body throws a raw
// TypeError instead of the intended 400 without this.
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const parseBlockedAppInput = (value: unknown): IAddBlockedAppPayload | null => {
  if (
    !isRecord(value) ||
    !isNonEmptyString(value.packageName) ||
    !isNonEmptyString(value.appName) ||
    value.packageName.trim().length > MAX_FIELD_LENGTH ||
    value.appName.trim().length > MAX_FIELD_LENGTH
  ) {
    return null;
  }

  return { packageName: value.packageName.trim(), appName: value.appName.trim() };
};

export class BlocklistHelpers {
  public static list = async (userId: string): Promise<IBlockedAppDto[]> => {
    const blockedApps = await prismaClient.blockedApp.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
    });

    return blockedApps.map(BlocklistHelpers.toDto);
  };

  public static add = async (
    userId: string,
    payload: unknown,
  ): Promise<IBlockedAppDto[]> => {
    const parsed = parseBlockedAppInput(payload);
    if (!parsed) {
      throw new AppError("A package name and app name are required", httpStatus.BAD_REQUEST);
    }

    // Adding an already-blocked package is a silent no-op, not an error —
    // the unique constraint on [userId, packageName] is what makes this
    // upsert-safe.
    await prismaClient.blockedApp.upsert({
      where: { userId_packageName: { userId, packageName: parsed.packageName } },
      update: {},
      create: { userId, packageName: parsed.packageName, appName: parsed.appName },
    });

    return BlocklistHelpers.list(userId);
  };

  public static remove = async (userId: string, packageName: string): Promise<IBlockedAppDto[]> => {
    // Removing a non-present package is also a silent no-op, not an error.
    // Trimmed to match how `add`/`seedDefaults` now store the value.
    await prismaClient.blockedApp.deleteMany({
      where: { userId, packageName: packageName.trim() },
    });

    return BlocklistHelpers.list(userId);
  };

  public static seedDefaults = async (
    userId: string,
    payload: unknown,
  ): Promise<IBlockedAppDto[]> => {
    // Capped well above the real 3-item default set — this endpoint is only
    // ever meant to seed a small known list; a large payload would otherwise
    // run an unbounded number of upserts inside one transaction.
    if (!Array.isArray(payload) || payload.length > MAX_SEED_DEFAULTS_LENGTH) {
      throw new AppError("A list of default apps is required", httpStatus.BAD_REQUEST);
    }

    const user = await prismaClient.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new AppError("User not found", httpStatus.NOT_FOUND);
    }

    // Already seeded once — no-op entirely, including not re-adding
    // previously-removed defaults, so a removed default never silently
    // reappears on relaunch.
    if (user.blocklistDefaultsSeeded) {
      return BlocklistHelpers.list(userId);
    }

    const validDefaults = (payload as ISeedBlocklistDefaultsPayload)
      .map(parseBlockedAppInput)
      .filter((item): item is IAddBlockedAppPayload => item !== null);

    // Single transaction: either the inserts and the seeded flag both land,
    // or neither does — the flag can never be set without the inserts, or
    // vice versa.
    await prismaClient.$transaction(async (tx) => {
      for (const item of validDefaults) {
        await tx.blockedApp.upsert({
          where: { userId_packageName: { userId, packageName: item.packageName } },
          update: {},
          create: { userId, packageName: item.packageName, appName: item.appName },
        });
      }

      await tx.user.update({
        where: { id: userId },
        data: { blocklistDefaultsSeeded: true },
      });
    });

    return BlocklistHelpers.list(userId);
  };

  private static toDto = (blockedApp: BlockedApp): IBlockedAppDto => ({
    id: blockedApp.id,
    packageName: blockedApp.packageName,
    appName: blockedApp.appName,
    createdAt: blockedApp.createdAt.toISOString(),
  });
}
