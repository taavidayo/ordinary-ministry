-- AlterTable
ALTER TABLE "ServiceSlot" ADD COLUMN     "notes" TEXT,
ADD COLUMN     "rehearsal" BOOLEAN NOT NULL DEFAULT false;
