-- CreateTable
CREATE TABLE "SermonPlaylist" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "youtubePlaylistId" TEXT NOT NULL,
    "defaultSpeaker" TEXT NOT NULL DEFAULT '',
    "autoSync" BOOLEAN NOT NULL DEFAULT true,
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SermonPlaylist_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SermonPlaylist_youtubePlaylistId_key" ON "SermonPlaylist"("youtubePlaylistId");

-- AlterTable
ALTER TABLE "Sermon" ADD COLUMN "youtubeVideoId" TEXT;
ALTER TABLE "Sermon" ADD COLUMN "playlistId" TEXT;

-- AddForeignKey
ALTER TABLE "Sermon" ADD CONSTRAINT "Sermon_playlistId_fkey" FOREIGN KEY ("playlistId") REFERENCES "SermonPlaylist"("id") ON DELETE SET NULL ON UPDATE CASCADE;
