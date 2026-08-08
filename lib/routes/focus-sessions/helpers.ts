import httpStatus from "http-status";
import { FocusSession, SessionEndReason, WorkTypeTier } from "@prisma/client";
import { prismaClient } from "@/db/db";
import { AppError } from "@/utils/helpers/appError";
import { startOfUtcDay } from "@/utils/helpers/date";
import { getPlanLimitsForUser, isUserPro } from "@/utils/helpers/entitlement";
import { isNonEmptyString } from "@/utils/helpers/common";
import { classifySessionRoughness } from "@/utils/helpers/sessionRoughness";
import {
  classifyDistractionTiming,
  computeDistractionTimingBaseline,
  computeElapsedPercent,
  IDistractionTimingBaseline,
} from "@/utils/helpers/distractionTiming";
import { FocusSessionErrorCode } from "@/routes/focus-sessions/utils/enums";
import {
  IEndFocusSessionPayload,
  IFocusSessionDto,
  IPaginatedSessionHistory,
  IRecordBlockedAttemptPayload,
  ISessionSummary,
  ISessionTimelineDistraction,
  ISessionTimelineDto,
  ISessionTimelineStep,
  IStartFocusSessionPayload,
} from "@/routes/focus-sessions/utils/types";

const HISTORY_PAGE_SIZE = 20;
// Matches ProgressHelpers.buildWeekBuckets's own 8-week window -- bounded,
// not all-time, both so the baseline query stays cheap as history grows and
// so old behavior doesn't anchor "normal" for a user whose habits have
// since changed.
const BASELINE_WINDOW_DAYS = 56;

// design-artifacts/evolution/specs/03-companion-work-types.md's pacing
// decision, now scaled dynamically (see computeWorkUnitsCompleted) so the
// hive finishes exactly at the session's effective duration cap — this
// fixed 5-minutes-per-unit value only remains as the fallback for the rare
// session with no effective cap at all (uncapped Pro, no chosen duration).
const WORK_UNIT_SECONDS = 300;

export class FocusSessionsHelpers {
  public static start = async (
    userId: string,
    payload: IStartFocusSessionPayload,
  ): Promise<IFocusSessionDto> => {
    const existingActive = await prismaClient.focusSession.findFirst({
      where: { endedAt: null, mission: { userId } },
    });
    if (existingActive) {
      throw new AppError(
        "A focus session is already active",
        httpStatus.CONFLICT,
        FocusSessionErrorCode.SESSION_ALREADY_ACTIVE,
      );
    }

    const mission = await prismaClient.mission.findFirst({
      where: { id: payload.missionId, userId },
    });
    if (!mission) {
      throw new AppError("Mission not found", httpStatus.NOT_FOUND);
    }

    const limits = await getPlanLimitsForUser(userId);
    if (limits.dailySessionCap !== null) {
      const todaysSessionCount = await prismaClient.focusSession.count({
        where: { mission: { userId }, startedAt: { gte: startOfUtcDay(new Date()) } },
      });
      if (todaysSessionCount >= limits.dailySessionCap) {
        throw new AppError(
          "Daily session limit reached",
          httpStatus.FORBIDDEN,
          FocusSessionErrorCode.SESSION_CAP_REACHED,
        );
      }
    }

    const workTypeId = await FocusSessionsHelpers.resolveWorkTypeId(userId);

    const session = await prismaClient.focusSession.create({
      data: { missionId: mission.id, workTypeId },
    });

    return FocusSessionsHelpers.toDto(session);
  };

  public static getActive = async (userId: string): Promise<IFocusSessionDto | null> => {
    const session = await prismaClient.focusSession.findFirst({
      where: { endedAt: null, mission: { userId } },
      orderBy: { startedAt: "desc" },
    });
    return session ? FocusSessionsHelpers.toDto(session) : null;
  };

  // design-artifacts/evolution/specs/12-post-session-history-and-roughness.md
  // — the shared "one row per session, roughness-classified" list backing
  // both Home/Evening Review's "today's sessions" and the History screen.
  // Fetches every completed session (not just the requested slice) because
  // classifySessionRoughness's bounce-back check needs the full set to
  // correctly detect a same-day resume near a page boundary — acceptable at
  // this app's personal-scale session volume, same tradeoff ProgressHelpers
  // already makes fetching all missions/sessions for its own computations.
  // In-progress sessions (endedAt = null) are excluded — not yet a
  // real "how did it go" to classify.
  public static listSessionSummaries = async (userId: string): Promise<ISessionSummary[]> => {
    const sessions = await prismaClient.focusSession.findMany({
      where: { mission: { userId }, endedAt: { not: null } },
      include: { mission: { select: { title: true } } },
      orderBy: { startedAt: "desc" },
    });

    return sessions.map((session) => ({
      id: session.id,
      missionId: session.missionId,
      missionTitle: session.mission.title,
      startedAt: session.startedAt.toISOString(),
      endedAt: session.endedAt?.toISOString() ?? null,
      roughness: classifySessionRoughness(session, sessions),
    }));
  };

  public static history = async (
    userId: string,
    cursor: string | null,
    limit: number,
  ): Promise<IPaginatedSessionHistory> => {
    const pageSize = limit > 0 ? limit : HISTORY_PAGE_SIZE;
    const allSummaries = await FocusSessionsHelpers.listSessionSummaries(userId);

    const startIndex = cursor ? allSummaries.findIndex((summary) => summary.id === cursor) + 1 : 0;
    const items = allSummaries.slice(startIndex, startIndex + pageSize);
    const hasMore = startIndex + pageSize < allSummaries.length;

    return { items, nextCursor: hasMore ? items[items.length - 1].id : null };
  };

  // design-artifacts/evolution/specs/14-session-timeline.md — the Track 2
  // destination for a tapped session row. Server-side Pro gate (not just a
  // client-side hide) is a deliberate stricter choice than
  // ProgressHelpers.computeDeviceActivity's existing precedent, following
  // HiveThemeHelpers/BeeSkinHelpers's own real isUserPro-in-the-helper
  // pattern instead.
  public static getTimeline = async (userId: string, focusSessionId: string): Promise<ISessionTimelineDto> => {
    if (!(await isUserPro(userId))) {
      throw new AppError(
        "Session Timeline requires Pro",
        httpStatus.FORBIDDEN,
        FocusSessionErrorCode.SESSION_TIMELINE_REQUIRES_PRO,
      );
    }

    const session = await prismaClient.focusSession.findFirst({
      where: { id: focusSessionId, mission: { userId } },
      include: {
        mission: { select: { title: true, tasks: { orderBy: { order: "asc" } } } },
        blockedAttemptEvents: { orderBy: { occurredAt: "asc" } },
      },
    });
    if (!session || !session.endedAt) {
      throw new AppError("Focus session not found", httpStatus.NOT_FOUND);
    }
    const sessionStart = session.startedAt;
    const sessionEnd = session.endedAt;

    const [allUserSessions, blockedApps] = await Promise.all([
      prismaClient.focusSession.findMany({
        where: { mission: { userId }, endedAt: { not: null } },
        select: { id: true, startedAt: true },
      }),
      prismaClient.blockedApp.findMany({ where: { userId }, select: { packageName: true, appName: true } }),
    ]);
    const appNameByPackage = new Map(blockedApps.map((app) => [app.packageName, app.appName]));
    const roughness = classifySessionRoughness(session, allUserSessions);

    // Steps: clip each task's window to this session's own boundary. A
    // MissionTask has no focusSessionId (a mission can span multiple
    // sessions, Track 1's own finding) -- only tasks that actually overlap
    // this session belong on its timeline, and a task begun in an earlier
    // session shows only its in-session portion here, never its true
    // original start.
    const steps: ISessionTimelineStep[] = [];
    for (const task of session.mission.tasks) {
      if (task.startedAt === null) continue;
      if (task.startedAt > sessionEnd) continue;
      if (task.completedAt !== null && task.completedAt < sessionStart) continue;

      const clippedStart = task.startedAt > sessionStart ? task.startedAt : sessionStart;
      const clippedEnd = task.completedAt !== null && task.completedAt < sessionEnd ? task.completedAt : sessionEnd;

      steps.push({
        id: task.id,
        title: task.title,
        startedAt: clippedStart.toISOString(),
        completedAt: task.completedAt !== null && task.completedAt <= sessionEnd ? task.completedAt.toISOString() : null,
        actualSeconds: Math.max(0, Math.round((clippedEnd.getTime() - clippedStart.getTime()) / 1000)),
        estimatedMinutes: task.estimatedMinutes,
      });
    }

    const stepIdForMoment = (occurredAt: Date): string | null => {
      const step = steps.find((candidate) => {
        const start = new Date(candidate.startedAt);
        const end = candidate.completedAt ? new Date(candidate.completedAt) : sessionEnd;
        return occurredAt >= start && occurredAt <= end;
      });
      return step?.id ?? null;
    };

    const distractions: ISessionTimelineDistraction[] = session.blockedAttemptEvents.map((event) => ({
      id: event.id,
      occurredAt: event.occurredAt.toISOString(),
      packageName: event.packageName,
      appName: appNameByPackage.get(event.packageName) ?? null,
      stepId: stepIdForMoment(event.occurredAt),
    }));

    const firstBlock = session.blockedAttemptEvents[0] ?? null;
    const firstBlockElapsedPercent = firstBlock
      ? computeElapsedPercent(sessionStart, sessionEnd, firstBlock.occurredAt)
      : null;
    const firstBlockElapsedSeconds = firstBlock
      ? Math.max(0, Math.round((firstBlock.occurredAt.getTime() - sessionStart.getTime()) / 1000))
      : null;

    const baseline = await FocusSessionsHelpers.computeDistractionTimingBaselineForUser(userId, session.id);
    const distractionTiming = classifyDistractionTiming(
      session.blockedAttemptCount,
      firstBlockElapsedSeconds,
      firstBlockElapsedPercent,
      baseline,
    );

    return {
      id: session.id,
      missionId: session.missionId,
      missionTitle: session.mission.title,
      startedAt: session.startedAt.toISOString(),
      endedAt: sessionEnd.toISOString(),
      sessionEndReason: session.sessionEndReason,
      roughness,
      steps,
      distractions,
      distractionTiming,
    };
  };

  // excludeSessionId keeps the tapped session out of its own baseline --
  // otherwise a small sample near MIN_BASELINE_SESSIONS would be biased
  // toward comparing this session against itself.
  private static computeDistractionTimingBaselineForUser = async (
    userId: string,
    excludeSessionId: string,
  ): Promise<IDistractionTimingBaseline> => {
    const cutoff = new Date(Date.now() - BASELINE_WINDOW_DAYS * 24 * 60 * 60 * 1000);
    const candidateSessions = await prismaClient.focusSession.findMany({
      where: {
        mission: { userId },
        id: { not: excludeSessionId },
        endedAt: { not: null },
        blockedAttemptCount: { gt: 0 },
        startedAt: { gte: cutoff },
      },
      select: {
        startedAt: true,
        endedAt: true,
        blockedAttemptEvents: { orderBy: { occurredAt: "asc" }, take: 1, select: { occurredAt: true } },
      },
    });

    const percents = candidateSessions
      .filter((candidate) => candidate.endedAt !== null && candidate.blockedAttemptEvents.length > 0)
      .map((candidate) => computeElapsedPercent(candidate.startedAt, candidate.endedAt!, candidate.blockedAttemptEvents[0].occurredAt));

    return computeDistractionTimingBaseline(percents);
  };

  // Uses the user's Bee's Hive selection if they've made one; falls back to
  // the first active Free work type for a user who's never visited the Hive
  // (including every pre-existing user as of this feature shipping) so a
  // session is never left with no work type at all.
  private static resolveWorkTypeId = async (userId: string): Promise<string | null> => {
    const user = await prismaClient.user.findUnique({
      where: { id: userId },
      select: { selectedWorkTypeId: true },
    });
    if (user?.selectedWorkTypeId) return user.selectedWorkTypeId;

    const defaultWorkType = await prismaClient.workType.findFirst({
      where: { isActive: true, tier: WorkTypeTier.FREE },
      orderBy: { createdAt: "asc" },
    });
    return defaultWorkType?.id ?? null;
  };

  public static recordBlockedAttempt = async (
    userId: string,
    focusSessionId: string,
    payload: IRecordBlockedAttemptPayload,
  ): Promise<IFocusSessionDto> => {
    const session = await FocusSessionsHelpers.findOwnedSession(userId, focusSessionId);

    const capSeconds = await FocusSessionsHelpers.getEffectiveDurationCapSeconds(
      userId,
      session.mission.estimatedMinutes,
    );
    if (capSeconds !== null) {
      const elapsedSeconds = Math.round((Date.now() - session.startedAt.getTime()) / 1000);
      if (elapsedSeconds > capSeconds) {
        throw new AppError(
          "Free session time limit reached",
          httpStatus.FORBIDDEN,
          FocusSessionErrorCode.SESSION_TIME_LIMIT_REACHED,
        );
      }
    }

    const updated = await prismaClient.$transaction(async (tx) => {
      if (isNonEmptyString(payload.packageName)) {
        await tx.blockedAttemptEvent.create({
          data: { focusSessionId: session.id, packageName: payload.packageName.trim() },
        });
      }

      return tx.focusSession.update({
        where: { id: session.id },
        data: { blockedAttemptCount: { increment: 1 } },
      });
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

    // Free-tier/mission duration cap is enforced here, not just trusted from
    // the client — a modified client could otherwise self-report unlimited
    // time.
    const cap = await FocusSessionsHelpers.getEffectiveDurationCapSeconds(
      userId,
      session.mission.estimatedMinutes,
    );

    let elapsedSeconds = actualElapsedSeconds;
    let sessionEndReason = payload.sessionEndReason;
    if (cap !== null && actualElapsedSeconds > cap) {
      elapsedSeconds = cap;
      sessionEndReason = SessionEndReason.TIME_LIMIT_REACHED;
    }

    const workUnitsCompleted = await FocusSessionsHelpers.computeWorkUnitsCompleted(
      session.workTypeId,
      elapsedSeconds,
      cap,
    );

    const updated = await prismaClient.focusSession.update({
      where: { id: session.id },
      data: { endedAt, elapsedSeconds, sessionEndReason, workUnitsCompleted },
    });

    return FocusSessionsHelpers.toDto(updated);
  };

  // Computed from the already cap-clamped elapsedSeconds (not the raw,
  // pre-clamp actualElapsedSeconds) — a Free user who hits the duration cap
  // shouldn't bank work credit for time beyond what was actually enforced.
  // effectiveDurationSeconds paces the fill so the hive finishes exactly at
  // that duration (a 20-minute mission fills in 20 minutes, a 4-hour one
  // over 4 hours) — falls back to the fixed WORK_UNIT_SECONDS only when
  // there's no effective duration at all (uncapped Pro, no chosen duration).
  private static computeWorkUnitsCompleted = async (
    workTypeId: string | null,
    elapsedSeconds: number,
    effectiveDurationSeconds: number | null,
  ): Promise<number> => {
    if (!workTypeId) return 0;
    const workType = await prismaClient.workType.findUnique({ where: { id: workTypeId } });
    if (!workType || workType.totalUnits <= 0) return 0;
    const unitSeconds =
      effectiveDurationSeconds !== null ? effectiveDurationSeconds / workType.totalUnits : WORK_UNIT_SECONDS;
    return Math.min(Math.floor(elapsedSeconds / unitSeconds), workType.totalUnits);
  };

  // The smaller of the caller's plan cap and the mission's own chosen focus
  // duration — null only when neither is set (uncapped Pro, no chosen
  // duration), meaning no cap applies at all.
  private static getEffectiveDurationCapSeconds = async (
    userId: string,
    missionEstimatedMinutes: number | null,
  ): Promise<number | null> => {
    const limits = await getPlanLimitsForUser(userId);
    const planCapSeconds = limits.sessionDurationCapSeconds;
    const missionCapSeconds = missionEstimatedMinutes !== null ? missionEstimatedMinutes * 60 : null;

    if (planCapSeconds === null) return missionCapSeconds;
    if (missionCapSeconds === null) return planCapSeconds;
    return Math.min(planCapSeconds, missionCapSeconds);
  };

  private static findOwnedSession = async (
    userId: string,
    focusSessionId: string,
  ): Promise<FocusSession & { mission: { estimatedMinutes: number | null } }> => {
    const session = await prismaClient.focusSession.findFirst({
      where: { id: focusSessionId, mission: { userId } },
      include: { mission: { select: { estimatedMinutes: true } } },
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
    workTypeId: session.workTypeId,
    workUnitsCompleted: session.workUnitsCompleted,
  });
}
