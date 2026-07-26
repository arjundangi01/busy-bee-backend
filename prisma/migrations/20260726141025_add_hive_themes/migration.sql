-- AlterTable
ALTER TABLE "User" ADD COLUMN     "selectedThemeId" TEXT;

-- CreateTable
CREATE TABLE "HiveTheme" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "tier" "WorkTypeTier" NOT NULL,
    "skyTop" TEXT NOT NULL,
    "skyBottom" TEXT NOT NULL,
    "wallTop" TEXT NOT NULL,
    "wallBottom" TEXT NOT NULL,
    "floorTop" TEXT NOT NULL,
    "floorBottom" TEXT NOT NULL,
    "lanternGlow" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HiveTheme_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "HiveTheme_key_key" ON "HiveTheme"("key");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_selectedThemeId_fkey" FOREIGN KEY ("selectedThemeId") REFERENCES "HiveTheme"("id") ON DELETE SET NULL ON UPDATE CASCADE;
