-- AlterTable
ALTER TABLE "User" ADD COLUMN     "eodNudgeEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "pushNotificationsEnabled" BOOLEAN NOT NULL DEFAULT true;

