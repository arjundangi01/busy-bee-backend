-- AlterTable
ALTER TABLE "User" ADD COLUMN     "selectedSkinId" TEXT;

-- CreateTable
CREATE TABLE "BeeSkin" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "tier" "WorkTypeTier" NOT NULL,
    "bodyPrimary" TEXT NOT NULL,
    "bodySecondary" TEXT NOT NULL,
    "stripe" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BeeSkin_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BeeSkin_key_key" ON "BeeSkin"("key");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_selectedSkinId_fkey" FOREIGN KEY ("selectedSkinId") REFERENCES "BeeSkin"("id") ON DELETE SET NULL ON UPDATE CASCADE;
