-- CreateTable: ServiceTime
CREATE TABLE "ServiceTime" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "ServiceTime_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey for ServiceTime → Service
ALTER TABLE "ServiceTime" ADD CONSTRAINT "ServiceTime_serviceId_fkey"
    FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create a default "Main Service" ServiceTime for every existing Service
INSERT INTO "ServiceTime" ("id", "serviceId", "label", "order")
SELECT gen_random_uuid()::TEXT, "id", 'Main Service', 0 FROM "Service";

-- Add serviceTimeId as nullable first (so existing rows don't fail)
ALTER TABLE "ProgramItem" ADD COLUMN "serviceTimeId" TEXT;

-- Backfill: each ProgramItem gets the ServiceTime that matches its serviceId
UPDATE "ProgramItem" pi
SET "serviceTimeId" = st."id"
FROM "ServiceTime" st
WHERE st."serviceId" = pi."serviceId";

-- Make serviceTimeId NOT NULL
ALTER TABLE "ProgramItem" ALTER COLUMN "serviceTimeId" SET NOT NULL;

-- AddForeignKey for ProgramItem → ServiceTime
ALTER TABLE "ProgramItem" ADD CONSTRAINT "ProgramItem_serviceTimeId_fkey"
    FOREIGN KEY ("serviceTimeId") REFERENCES "ServiceTime"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- DropForeignKey for ProgramItem → Service
ALTER TABLE "ProgramItem" DROP CONSTRAINT "ProgramItem_serviceId_fkey";

-- DropColumn serviceId from ProgramItem
ALTER TABLE "ProgramItem" DROP COLUMN "serviceId";
