-- CreateEnum
CREATE TYPE "AuthProvider" AS ENUM ('EMAIL', 'GOOGLE');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "authProvider" "AuthProvider" NOT NULL DEFAULT 'EMAIL',
ADD COLUMN     "firebaseUid" TEXT,
ALTER COLUMN "passwordHash" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "User_firebaseUid_key" ON "User"("firebaseUid");

