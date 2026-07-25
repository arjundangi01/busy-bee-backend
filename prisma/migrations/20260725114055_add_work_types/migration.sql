-- CreateEnum
CREATE TYPE "WorkTypeTier" AS ENUM ('FREE', 'PRO');

-- AlterTable
ALTER TABLE "FocusSession" ADD COLUMN     "workTypeId" TEXT,
ADD COLUMN     "workUnitsCompleted" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "selectedWorkTypeId" TEXT;

-- CreateTable
CREATE TABLE "WorkType" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "tier" "WorkTypeTier" NOT NULL,
    "totalUnits" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkType_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WorkType_key_key" ON "WorkType"("key");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_selectedWorkTypeId_fkey" FOREIGN KEY ("selectedWorkTypeId") REFERENCES "WorkType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FocusSession" ADD CONSTRAINT "FocusSession_workTypeId_fkey" FOREIGN KEY ("workTypeId") REFERENCES "WorkType"("id") ON DELETE SET NULL ON UPDATE CASCADE;
