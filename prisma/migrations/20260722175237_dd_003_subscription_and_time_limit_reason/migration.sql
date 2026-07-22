-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'CANCELLED', 'BILLING_ISSUE');

-- CreateEnum
CREATE TYPE "SubscriptionProvider" AS ENUM ('IOS', 'ANDROID');

-- AlterEnum
ALTER TYPE "SessionEndReason" ADD VALUE 'TIME_LIMIT_REACHED';

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "SubscriptionStatus" NOT NULL,
    "provider" "SubscriptionProvider" NOT NULL,
    "productId" TEXT NOT NULL,
    "originalTransactionId" TEXT,
    "expiresAt" TIMESTAMP(3),
    "autoRenewing" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_userId_key" ON "Subscription"("userId");

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
