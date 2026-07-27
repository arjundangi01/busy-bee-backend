-- CreateTable
CREATE TABLE "AppUsageDaily" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "packageName" TEXT NOT NULL,
    "appName" TEXT NOT NULL,
    "foregroundSeconds" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppUsageDaily_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeviceActivityDaily" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "pickupCount" INTEGER NOT NULL,
    "firstPickupAt" TIMESTAMP(3),
    "lastPickupAt" TIMESTAMP(3),
    "offlineSeconds" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeviceActivityDaily_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AppUsageDaily_userId_date_packageName_key" ON "AppUsageDaily"("userId", "date", "packageName");

-- CreateIndex
CREATE UNIQUE INDEX "DeviceActivityDaily_userId_date_key" ON "DeviceActivityDaily"("userId", "date");

-- AddForeignKey
ALTER TABLE "AppUsageDaily" ADD CONSTRAINT "AppUsageDaily_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeviceActivityDaily" ADD CONSTRAINT "DeviceActivityDaily_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
