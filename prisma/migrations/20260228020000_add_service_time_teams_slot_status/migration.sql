-- Add serviceTimeId to ServiceTeam
ALTER TABLE "ServiceTeam" ADD COLUMN "serviceTimeId" TEXT;
ALTER TABLE "ServiceTeam" ADD CONSTRAINT "ServiceTeam_serviceTimeId_fkey"
  FOREIGN KEY ("serviceTimeId") REFERENCES "ServiceTime"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Add status to ServiceSlot
ALTER TABLE "ServiceSlot" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'PENDING';
