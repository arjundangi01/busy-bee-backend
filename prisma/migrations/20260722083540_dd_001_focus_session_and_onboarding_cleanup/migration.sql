-- CreateEnum
CREATE TYPE "SessionEndReason" AS ENUM ('MISSION_COMPLETED', 'EARLY_EXIT');

-- DropForeignKey
ALTER TABLE "UserProfile" DROP CONSTRAINT "UserProfile_userId_fkey";

-- AlterTable
ALTER TABLE "Mission" ALTER COLUMN "estimatedMinutes" DROP NOT NULL;

-- AlterTable
ALTER TABLE "MissionTask" ALTER COLUMN "estimatedMinutes" DROP NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "backgroundExecutionGranted" BOOLEAN,
ADD COLUMN     "notificationsGranted" BOOLEAN;

-- DropTable
DROP TABLE "UserProfile";

-- DropEnum
DROP TYPE "CommitmentLevel";

-- DropEnum
DROP TYPE "Goal";

-- DropEnum
DROP TYPE "UserRole";

-- CreateTable
CREATE TABLE "FocusSession" (
    "id" TEXT NOT NULL,
    "missionId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "elapsedSeconds" INTEGER,
    "sessionEndReason" "SessionEndReason",
    "blockedAttemptCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "FocusSession_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "FocusSession" ADD CONSTRAINT "FocusSession_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "Mission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

