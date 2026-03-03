ALTER TYPE "ProgramItemType" ADD VALUE 'HEADER';
ALTER TABLE "ServiceTime" ADD COLUMN "startTime" TEXT;
CREATE TABLE "ServiceScheduleEntry" (
  "id" TEXT NOT NULL,
  "serviceId" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "startTime" TEXT,
  "order" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "ServiceScheduleEntry_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ServiceScheduleEntry_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
