-- AlterTable
ALTER TABLE "MissionTask" ADD COLUMN     "startedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "BlockedAttemptEvent" (
    "id" TEXT NOT NULL,
    "focusSessionId" TEXT NOT NULL,
    "packageName" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BlockedAttemptEvent_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "BlockedAttemptEvent" ADD CONSTRAINT "BlockedAttemptEvent_focusSessionId_fkey" FOREIGN KEY ("focusSessionId") REFERENCES "FocusSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
