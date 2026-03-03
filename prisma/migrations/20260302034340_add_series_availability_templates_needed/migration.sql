-- DropForeignKey
ALTER TABLE "ServiceSlot" DROP CONSTRAINT "ServiceSlot_roleId_fkey";

-- AlterTable
ALTER TABLE "Service" ADD COLUMN     "seriesId" TEXT;

-- AlterTable
ALTER TABLE "TeamRole" ADD COLUMN     "needed" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "ServiceSeries" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ServiceSeries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Availability" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Availability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ServiceTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceTemplateTime" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "startTime" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ServiceTemplateTime_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceTemplateItem" (
    "id" TEXT NOT NULL,
    "templateTimeId" TEXT NOT NULL,
    "type" "ProgramItemType" NOT NULL,
    "name" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ServiceTemplateItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceTemplateTeam" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "templateTimeId" TEXT,

    CONSTRAINT "ServiceTemplateTeam_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Availability_userId_date_key" ON "Availability"("userId", "date");

-- AddForeignKey
ALTER TABLE "Service" ADD CONSTRAINT "Service_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "ServiceSeries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceSlot" ADD CONSTRAINT "ServiceSlot_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "TeamRole"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Availability" ADD CONSTRAINT "Availability_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceTemplateTime" ADD CONSTRAINT "ServiceTemplateTime_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ServiceTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceTemplateItem" ADD CONSTRAINT "ServiceTemplateItem_templateTimeId_fkey" FOREIGN KEY ("templateTimeId") REFERENCES "ServiceTemplateTime"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceTemplateTeam" ADD CONSTRAINT "ServiceTemplateTeam_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ServiceTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceTemplateTeam" ADD CONSTRAINT "ServiceTemplateTeam_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceTemplateTeam" ADD CONSTRAINT "ServiceTemplateTeam_templateTimeId_fkey" FOREIGN KEY ("templateTimeId") REFERENCES "ServiceTemplateTime"("id") ON DELETE SET NULL ON UPDATE CASCADE;
