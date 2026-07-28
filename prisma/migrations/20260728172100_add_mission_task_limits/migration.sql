-- AlterTable
ALTER TABLE "PlanLimits" ADD COLUMN     "maxMissionMinutes" INTEGER,
ADD COLUMN     "maxTasksPerMission" INTEGER;

-- Seed FREE's new caps: 6 tasks per mission, 4 hours (240 min) combined task
-- time per mission — same "change the row directly" pattern DD-003's own
-- PlanLimits migration documents. PRO stays NULL/NULL (unlimited), which is
-- already the default for a new nullable column on existing rows.
UPDATE "PlanLimits"
SET "maxTasksPerMission" = 6, "maxMissionMinutes" = 240, "updatedAt" = CURRENT_TIMESTAMP
WHERE "tier" = 'FREE';
