import httpStatus from "http-status";
import { Prisma, SubscriptionStatus } from "@prisma/client";
import { prismaClient } from "@/db/db";
import { AppError } from "@/utils/helpers/appError";
import { isNonEmptyString } from "@/utils/helpers/common";
import { attemptSubscriptionCancellation } from "@/utils/helpers/subscriptionCancellation";
import { deleteFirebaseUser } from "@/utils/helpers/firebaseAdmin";
import { env } from "@/utils/configuration/env";
import { sendDeletionEmail } from "@/services/email/sendDeletionEmail";
import { createDeletionToken, verifyDeletionToken } from "@/routes/account/utils/token";
import { IDeleteConfirmPayload, IDeleteRequestPayload } from "@/routes/account/utils/types";

const INVALID_TOKEN_MESSAGE = "This link is invalid or has expired";

// Statuses where RevenueCat may still be actively trying to bill —
// mirrors webhooks/helpers.ts's STILL_BILLING_EVENT_TYPES concept, applied
// to subscription state instead of event type. BILLING_ISSUE means a charge
// attempt failed but RevenueCat is typically still retrying, so it's not
// safe to treat as "nothing to cancel" the way EXPIRED/CANCELLED are.
const STILL_BILLING_STATUSES = new Set<SubscriptionStatus>([
  SubscriptionStatus.ACTIVE,
  SubscriptionStatus.BILLING_ISSUE,
]);

export class AccountHelpers {
  public static requestDeletion = async (payload: IDeleteRequestPayload): Promise<void> => {
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

  public static confirmDeletion = async (payload: IDeleteConfirmPayload): Promise<void> => {
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

    if (subscription && STILL_BILLING_STATUSES.has(subscription.status)) {
      await attemptSubscriptionCancellation({
        userId: user.id,
        provider: subscription.provider,
        productId: subscription.productId,
      });
    }

    // Best-effort — mirrors attemptSubscriptionCancellation's own
    // never-block-deletion stance. Not configured in every environment
    // (FIREBASE_SERVICE_ACCOUNT_JSON is optional), and a user who never
    // signed in with Google has no firebaseUid to begin with.
    if (user.firebaseUid) {
      await deleteFirebaseUser(user.firebaseUid).catch((error) => {
        console.error(`Failed to delete Firebase Auth identity for user ${user.id}:`, error);
      });
    }

    try {
      await prismaClient.$transaction(async (tx) => {
        // Written in the same transaction as the hard delete below — either
        // both commit or neither does. This is what makes a concurrent or
        // retried call for the same user safe: it can never produce a
        // DeletionAudit row without a matching actual deletion, or vice versa.
        await tx.deletionAudit.create({
          data: {
            originalUserId: user.id,
            email: user.email,
            revenueCatAppUserId: user.id,
            subscriptionStatusAtDeletion: subscription?.status ?? null,
          },
        });
        // DB-level onDelete: Cascade (schema.prisma) handles every dependent
        // row — missions, tasks, focus sessions, blocked-attempt events,
        // blocklist, usage/activity rollups, subscription — in this one call.
        await tx.user.delete({ where: { id: userId } });
      });
    } catch (error) {
      // A concurrent or retried call already deleted this user (e.g. a
      // double-tap, or two devices signed in at once) — nothing left to do,
      // so treat it as success rather than surfacing a raw 500.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
        return;
      }
      throw error;
    }
  };

  private static parseEmail = (payload: IDeleteRequestPayload): string => {
    if (!isNonEmptyString(payload.email) || !payload.email.includes("@")) {
      throw new AppError("A valid email is required", httpStatus.BAD_REQUEST);
    }
    return payload.email.trim().toLowerCase();
  };

  private static parseToken = (payload: IDeleteConfirmPayload): string => {
    if (!isNonEmptyString(payload.token)) {
      throw new AppError("A token is required", httpStatus.BAD_REQUEST);
    }
    return payload.token;
  };
}
