import { SessionEndReason } from "@prisma/client";
import { prismaClient } from "@/db/db";
import { FocusSessionsHelpers } from "@/routes/focus-sessions/helpers";
import { expiredSessionWhere } from "@/routes/focus-sessions/utils/sessionStatus";

// Closes out focus sessions nobody ever ended: a Free session past its real
// duration cap, or a Pro session past the 24h abandonment safety net (see
// sessionStatus.ts). Reads never depend on this running promptly -- it's
// data-hygiene/analytics correctness (accurate elapsedSeconds, no zombie
// "active" rows), not what stops on-device blocking.
export const expireStaleFocusSessions = async (): Promise<void> => {
  const stale = await prismaClient.focusSession.findMany({
    where: expiredSessionWhere(),
    include: { mission: { select: { userId: true } } },
  });

  for (const session of stale) {
    try {
      await FocusSessionsHelpers.end(session.mission.userId, session.id, {
        sessionEndReason: SessionEndReason.TIME_LIMIT_REACHED,
      });
    } catch (error) {
      // One bad row shouldn't stop the sweep from closing the rest.
      console.error(`Failed to auto-end stale focus session ${session.id}:`, error);
    }
  }
};
