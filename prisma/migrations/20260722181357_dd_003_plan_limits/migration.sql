-- CreateEnum
CREATE TYPE "PlanTier" AS ENUM ('FREE', 'PRO');

-- CreateTable
CREATE TABLE "PlanLimits" (
    "id" TEXT NOT NULL,
    "tier" "PlanTier" NOT NULL,
    "dailySessionCap" INTEGER,
    "sessionDurationCapSeconds" INTEGER,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlanLimits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PlanLimits_tier_key" ON "PlanLimits"("tier");

-- Seed the two tiers' limits. FREE: 2 sessions/day, 1-hour session cap.
-- PRO: both null (unlimited). Change these rows directly to change business
-- limits without a code deploy — that's the whole point of this table.
INSERT INTO "PlanLimits" ("id", "tier", "dailySessionCap", "sessionDurationCapSeconds", "updatedAt")
VALUES
  ('planlimits_free', 'FREE', 2, 3600, CURRENT_TIMESTAMP),
  ('planlimits_pro', 'PRO', NULL, NULL, CURRENT_TIMESTAMP);
