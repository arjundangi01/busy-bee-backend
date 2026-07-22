import httpStatus from "http-status";
import { FocusSession, SessionEndReason } from "@prisma/client";
import { prismaClient } from "@/db/db";
import { AppError } from "@/utils/helpers/appError";
import { startOfUtcDay } from "@/utils/helpers/date";
import { isUserPro } from "@/utils/helpers/entitlement";
import {
  FREE_TIER_DAILY_SESSION_CAP,
  FREE_TIER_SESSION_DURATION_CAP_SECONDS,
} from "@/utils/constants/entitlement";
import { FocusSessionErrorCode } from "@/routes/focus-sessions/utils/enums";
import {
  IEndFocusSessionPayload,
  IFocusSessionDto,
  IStartFocusSessionPayload,
} from "@/routes/focus-sessions/utils/types";

export class FocusSessionsHelpers {
  public static start = async (
    userId: string,
    payload: IStartFocusSessionPayload,
  ): Promise<IFocusSessionDto> => {
    const mission = await prismaClient.mission.findFirst({
      where: { id: payload.missionId, userId },
    });
    if (!mission) {
      throw new AppError("Mission not found", httpStatus.NOT_FOUND);
    }

    const isPro = await isUserPro(userId);
    if (!isPro) {
      const todaysSessionCount = await prismaClient.focusSession.count({
        where: { mission: { userId }, startedAt: { gte: startOfUtcDay(new Date()) } },
      });
      if (todaysSessionCount >= FREE_TIER_DAILY_SESSION_CAP) {
        throw new AppError(
          "Daily session limit reached",
          httpStatus.FORBIDDEN,
          FocusSessionErrorCode.SESSION_CAP_REACHED,
        );
      }
    }

    const session = await prismaClient.focusSession.create({
      data: { missionId: mission.id },
    });

    return FocusSessionsHelpers.toDto(session);
  };

  public static recordBlockedAttempt = async (
    userId: string,
    focusSessionId: string,
  ): Promise<IFocusSessionDto> => {
    const session = await FocusSessionsHelpers.findOwnedSession(userId, focusSessionId);

    const isPro = await isUserPro(userId);
    if (!isPro) {
      const elapsedSeconds = Math.round((Date.now() - session.startedAt.getTime()) / 1000);
      if (elapsedSeconds > FREE_TIER_SESSION_DURATION_CAP_SECONDS) {
        throw new AppError(
          "Free session time limit reached",
          httpStatus.FORBIDDEN,
          FocusSessionErrorCode.SESSION_TIME_LIMIT_REACHED,
        );
      }
    }

    const updated = await prismaClient.focusSession.update({
      where: { id: session.id },
      data: { blockedAttemptCount: { increment: 1 } },
    });

    return FocusSessionsHelpers.toDto(updated);
  };

  public static end = async (
    userId: string,
    focusSessionId: string,
    payload: IEndFocusSessionPayload,
  ): Promise<IFocusSessionDto> => {
    if (!Object.values(SessionEndReason).includes(payload.sessionEndReason)) {
      throw new AppError("A valid session end reason is required", httpStatus.BAD_REQUEST);
    }

    const session = await FocusSessionsHelpers.findOwnedSession(userId, focusSessionId);
    const endedAt = new Date();
    const actualElapsedSeconds = Math.round((endedAt.getTime() - session.startedAt.getTime()) / 1000);

    // Free-tier duration cap is enforced here, not just trusted from the
    // client — a modified client could otherwise self-report unlimited time.
    const isPro = await isUserPro(userId);
    const isOverCap = !isPro && actualElapsedSeconds > FREE_TIER_SESSION_DURATION_CAP_SECONDS;
    const elapsedSeconds = isOverCap ? FREE_TIER_SESSION_DURATION_CAP_SECONDS : actualElapsedSeconds;
    const sessionEndReason = isOverCap ? SessionEndReason.TIME_LIMIT_REACHED : payload.sessionEndReason;

    const updated = await prismaClient.focusSession.update({
      where: { id: session.id },
      data: { endedAt, elapsedSeconds, sessionEndReason },
    });

    return FocusSessionsHelpers.toDto(updated);
  };

  private static findOwnedSession = async (
    userId: string,
    focusSessionId: string,
  ): Promise<FocusSession> => {
    const session = await prismaClient.focusSession.findFirst({
      where: { id: focusSessionId, mission: { userId } },
    });
    if (!session) {
      throw new AppError("Focus session not found", httpStatus.NOT_FOUND);
    }
    return session;
  };

  private static toDto = (session: FocusSession): IFocusSessionDto => ({
    id: session.id,
    missionId: session.missionId,
    startedAt: session.startedAt.toISOString(),
    endedAt: session.endedAt?.toISOString() ?? null,
    elapsedSeconds: session.elapsedSeconds,
    sessionEndReason: session.sessionEndReason,
    blockedAttemptCount: session.blockedAttemptCount,
  });
}
