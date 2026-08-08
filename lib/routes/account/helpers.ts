import httpStatus from "http-status";
import { SubscriptionStatus } from "@prisma/client";
import { prismaClient } from "@/db/db";
import { AppError } from "@/utils/helpers/appError";
import { isNonEmptyString } from "@/utils/helpers/common";
import { attemptSubscriptionCancellation } from "@/utils/helpers/subscriptionCancellation";
import { env } from "@/utils/configuration/env";
import { sendDeletionEmail } from "@/services/email/sendDeletionEmail";
import { createDeletionToken, verifyDeletionToken } from "@/routes/account/utils/token";

const INVALID_TOKEN_MESSAGE = "This link is invalid or has expired";

// Guards against non-object bodies before any property access — same
// precedent as blocklist/helpers.ts's parseBlockedAppInput.
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

export class AccountHelpers {
  public static requestDeletion = async (payload: unknown): Promise<void> => {
    const email = AccountHelpers.parseEmail(payload);

    // No enumeration: caller always sends the same generic response
    // regardless of whether this finds a match — the only difference is
    // whether an email actually goes out.
    const user = await prismaClient.user.findUnique({ where: { email } });
    if (user) {
      const token = createDeletionToken(user.id);
      const confirmUrl = `${env.landingUrl}/delete-account/confirm?token=${token}`;
      await sendDeletionEmail(user.email, confirmUrl);
    }
  };

  public static confirmDeletion = async (payload: unknown): Promise<void> => {
    const token = AccountHelpers.parseToken(payload);

    const decoded = verifyDeletionToken(token);
    if (!decoded) {
      throw new AppError(INVALID_TOKEN_MESSAGE, httpStatus.BAD_REQUEST);
    }

    // Deletion is a hard delete, so a reused token's userId no longer
    // resolves here — that's what makes this double as the "already used"
    // check without a separate token-tracking table.
    const user = await prismaClient.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true },
    });
    if (!user) {
      throw new AppError(INVALID_TOKEN_MESSAGE, httpStatus.BAD_REQUEST);
    }

    await AccountHelpers.deleteAccount(decoded.userId);
  };

  public static deleteAuthenticatedAccount = async (userId: string): Promise<void> => {
    await AccountHelpers.deleteAccount(userId);
  };

  // Shared by all three entry points: delete-confirm, DELETE /account, and
  // (indirectly) delete-request never calls this directly — it only issues
  // the token that a later delete-confirm call redeems here.
  private static deleteAccount = async (userId: string): Promise<void> => {
    const [user, subscription] = await Promise.all([
      prismaClient.user.findUnique({ where: { id: userId } }),
      prismaClient.subscription.findUnique({ where: { userId } }),
    ]);
    if (!user) {
      throw new AppError("Account not found", httpStatus.NOT_FOUND);
    }

    if (subscription?.status === SubscriptionStatus.ACTIVE) {
      await attemptSubscriptionCancellation({
        userId: user.id,
        provider: subscription.provider,
        productId: subscription.productId,
      });
    }

    // Written before the hard delete, regardless of the cancellation
    // outcome above — this is the only trail left once the user row (and
    // everything else) is gone below.
    await prismaClient.deletionAudit.create({
      data: {
        originalUserId: user.id,
        email: user.email,
        revenueCatAppUserId: user.id,
        subscriptionStatusAtDeletion: subscription?.status ?? null,
      },
    });

    await AccountHelpers.hardDeleteUserData(userId);
  };

  // FK order matters — every relation below is ON DELETE RESTRICT, so
  // children must go before their parents or the transaction fails.
  private static hardDeleteUserData = async (userId: string): Promise<void> => {
    await prismaClient.$transaction(async (tx) => {
      const missions = await tx.mission.findMany({ where: { userId }, select: { id: true } });
      const missionIds = missions.map((mission) => mission.id);

      const focusSessions = await tx.focusSession.findMany({
        where: { missionId: { in: missionIds } },
        select: { id: true },
      });
      const focusSessionIds = focusSessions.map((session) => session.id);

      await tx.blockedAttemptEvent.deleteMany({ where: { focusSessionId: { in: focusSessionIds } } });
      await tx.focusSession.deleteMany({ where: { missionId: { in: missionIds } } });
      await tx.missionTask.deleteMany({ where: { missionId: { in: missionIds } } });
      await tx.mission.deleteMany({ where: { userId } });
      await tx.blockedApp.deleteMany({ where: { userId } });
      await tx.appUsageDaily.deleteMany({ where: { userId } });
      await tx.deviceActivityDaily.deleteMany({ where: { userId } });
      await tx.subscription.deleteMany({ where: { userId } });
      await tx.user.delete({ where: { id: userId } });
    });
  };

  private static parseEmail = (payload: unknown): string => {
    if (!isRecord(payload) || !isNonEmptyString(payload.email) || !payload.email.includes("@")) {
      throw new AppError("A valid email is required", httpStatus.BAD_REQUEST);
    }
    return payload.email.trim().toLowerCase();
  };

  private static parseToken = (payload: unknown): string => {
    if (!isRecord(payload) || !isNonEmptyString(payload.token)) {
      throw new AppError("A token is required", httpStatus.BAD_REQUEST);
    }
    return payload.token;
  };
}
