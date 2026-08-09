-- Add FocusSession.expiredAt: the duration-cap deadline locked in at session
-- start (Free: real cap, Pro: 24h safety net), used by sessionStatus.ts to
-- decide "is this session active" without re-deriving the cap on every read,
-- and by the cron sweep to find abandoned sessions to auto-close.
--
-- Added nullable first so existing rows don't block the ALTER, backfilled,
-- then locked to NOT NULL. Backfill values are not meant to be precise for
-- already-ended rows (expiredAt is only ever consulted for endedAt IS NULL
-- rows) -- COALESCE(endedAt, startedAt) + 24h is a safe, simple default for
-- both cases and makes any currently-open session immediately eligible for
-- the cron sweep on its first run after deploy, rather than silently never
-- expiring.
ALTER TABLE "FocusSession" ADD COLUMN "expiredAt" TIMESTAMP(3);

UPDATE "FocusSession"
SET "expiredAt" = COALESCE("endedAt", "startedAt") + INTERVAL '24 hours'
WHERE "expiredAt" IS NULL;

ALTER TABLE "FocusSession" ALTER COLUMN "expiredAt" SET NOT NULL;
