-- AlterEnum
ALTER TYPE "ProgramItemType" ADD VALUE 'ITEM';

-- AlterTable
ALTER TABLE "Service" ADD COLUMN     "category" TEXT;
