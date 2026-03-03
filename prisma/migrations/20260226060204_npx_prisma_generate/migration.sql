-- CreateTable
CREATE TABLE "SongNote" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "arrangementId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SongNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SongNote_userId_arrangementId_key" ON "SongNote"("userId", "arrangementId");

-- AddForeignKey
ALTER TABLE "SongNote" ADD CONSTRAINT "SongNote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SongNote" ADD CONSTRAINT "SongNote_arrangementId_fkey" FOREIGN KEY ("arrangementId") REFERENCES "Arrangement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
