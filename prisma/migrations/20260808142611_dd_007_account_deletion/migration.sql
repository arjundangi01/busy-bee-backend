-- CreateEnum
CREATE TYPE "SubscriptionErrorType" AS ENUM ('USER_NOT_FOUND', 'CANCEL_FAILED', 'DUPLICATE_EVENT', 'UNKNOWN_EVENT_TYPE');

-- CreateTable
CREATE TABLE "DeletionAudit" (
    "id" TEXT NOT NULL,
    "originalUserId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "revenueCatAppUserId" TEXT,
    "subscriptionStatusAtDeletion" "SubscriptionStatus",
    "deletedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeletionAudit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubscriptionErrorLog" (
    "id" TEXT NOT NULL,
    "type" "SubscriptionErrorType" NOT NULL,
    "context" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubscriptionErrorLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcessedRevenueCatEvent" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProcessedRevenueCatEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProcessedRevenueCatEvent_eventId_key" ON "ProcessedRevenueCatEvent"("eventId");
