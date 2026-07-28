-- Raise the Free tier's session duration cap from 1 hour to 4 hours, per
-- product decision — same "change the row directly" pattern the DD-003
-- PlanLimits migration documents. dailySessionCap (2/day) is untouched.
UPDATE "PlanLimits"
SET "sessionDurationCapSeconds" = 14400, "updatedAt" = CURRENT_TIMESTAMP
WHERE "tier" = 'FREE';
