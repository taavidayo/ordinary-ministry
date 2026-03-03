/*
  Warnings:

  - You are about to drop the `ServiceSong` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "ProgramItemType" AS ENUM ('SONG', 'SERMON', 'PRAYER');

-- DropForeignKey
ALTER TABLE "ServiceSong" DROP CONSTRAINT "ServiceSong_arrangementId_fkey";

-- DropForeignKey
ALTER TABLE "ServiceSong" DROP CONSTRAINT "ServiceSong_serviceId_fkey";

-- DropForeignKey
ALTER TABLE "ServiceSong" DROP CONSTRAINT "ServiceSong_songId_fkey";

-- DropTable
DROP TABLE "ServiceSong";

-- CreateTable
CREATE TABLE "ProgramItem" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "type" "ProgramItemType" NOT NULL,
    "order" INTEGER NOT NULL,
    "notes" TEXT,
    "songId" TEXT,
    "arrangementId" TEXT,

    CONSTRAINT "ProgramItem_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ProgramItem" ADD CONSTRAINT "ProgramItem_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgramItem" ADD CONSTRAINT "ProgramItem_songId_fkey" FOREIGN KEY ("songId") REFERENCES "Song"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgramItem" ADD CONSTRAINT "ProgramItem_arrangementId_fkey" FOREIGN KEY ("arrangementId") REFERENCES "Arrangement"("id") ON DELETE SET NULL ON UPDATE CASCADE;
