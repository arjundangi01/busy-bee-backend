import httpStatus from "http-status";
import { prismaClient } from "@/db/db";
import { AppError } from "@/utils/helpers/appError";
import { isNonEmptyString } from "@/utils/helpers/common";
import { IIngestAppUsageItem, IIngestDailyUsagePayload } from "@/routes/usage-stats/utils/types";

// Well above any real device's realistic launchable-app count — this only
// guards against a malformed/hostile payload ballooning the upsert loop.
const MAX_APP_USAGE_ITEMS = 300;
const MAX_FIELD_LENGTH = 200;
// Matches the existing `dayKey` helper's UTC-calendar-day format
// (backend/lib/utils/helpers/date.ts) — the client computes and posts its
// own day key rather than the server inferring one, since the aggregate is
// computed on-device against the device's own local day boundary.
const DAY_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isNonNegativeInt = (value: unknown): value is number =>
  typeof value === "number" && Number.isInteger(value) && value >= 0;

const parseAppUsageItem = (value: unknown): IIngestAppUsageItem | null => {
  if (
    !isRecord(value) ||
    !isNonEmptyString(value.packageName) ||
    !isNonEmptyString(value.appName) ||
    !isNonNegativeInt(value.foregroundSeconds)
  ) {
    return null;
  }

  return {
    packageName: value.packageName.trim().slice(0, MAX_FIELD_LENGTH),
    appName: value.appName.trim().slice(0, MAX_FIELD_LENGTH),
    foregroundSeconds: value.foregroundSeconds,
  };
};

const parseMillis = (value: unknown): Date | null => {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return null;
  return new Date(value);
};

export class UsageStatsHelpers {
  // Upserts, not inserts — the same day's aggregate can be posted more than
  // once (e.g. the user reopens the Progress tab later the same day with a
  // higher running total), and a day is always the full, latest picture,
  // never a delta to add on top of a previous post.
  public static ingestDaily = async (userId: string, payload: unknown): Promise<void> => {
    if (
      !isRecord(payload) ||
      !isNonEmptyString(payload.date) ||
      !DAY_KEY_PATTERN.test(payload.date) ||
      !Array.isArray(payload.appUsage) ||
      payload.appUsage.length > MAX_APP_USAGE_ITEMS ||
      !isRecord(payload.deviceActivity)
    ) {
      throw new AppError("A valid date, app usage list, and device activity are required", httpStatus.BAD_REQUEST);
    }

    const { date, appUsage, deviceActivity } = payload as unknown as IIngestDailyUsagePayload;

    if (!isNonNegativeInt(deviceActivity.pickupCount) || !isNonNegativeInt(deviceActivity.offlineSeconds)) {
      throw new AppError("Valid device activity totals are required", httpStatus.BAD_REQUEST);
    }

    const parsedAppUsage = appUsage
      .map(parseAppUsageItem)
      .filter((item): item is IIngestAppUsageItem => item !== null);
    const firstPickupAt = parseMillis(deviceActivity.firstPickupAtMillis);
    const lastPickupAt = parseMillis(deviceActivity.lastPickupAtMillis);

    await prismaClient.$transaction(async (tx) => {
      for (const item of parsedAppUsage) {
        await tx.appUsageDaily.upsert({
          where: { userId_date_packageName: { userId, date, packageName: item.packageName } },
          update: { appName: item.appName, foregroundSeconds: item.foregroundSeconds },
          create: {
            userId,
            date,
            packageName: item.packageName,
            appName: item.appName,
            foregroundSeconds: item.foregroundSeconds,
          },
        });
      }

      await tx.deviceActivityDaily.upsert({
        where: { userId_date: { userId, date } },
        update: {
          pickupCount: deviceActivity.pickupCount,
          offlineSeconds: deviceActivity.offlineSeconds,
          // Only overwrite an already-recorded pickup timestamp with a real
          // value — a same-day re-post that (for whatever reason) comes
          // back with no pickup data yet shouldn't erase a real one this
          // day already has, since a real first/last pickup can never
          // legitimately un-happen once the day has one on record.
          ...(firstPickupAt ? { firstPickupAt } : {}),
          ...(lastPickupAt ? { lastPickupAt } : {}),
        },
        create: {
          userId,
          date,
          pickupCount: deviceActivity.pickupCount,
          firstPickupAt,
          lastPickupAt,
          offlineSeconds: deviceActivity.offlineSeconds,
        },
      });
    });
  };
}
