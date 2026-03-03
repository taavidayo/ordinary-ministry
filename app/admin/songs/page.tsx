import { db } from "@/lib/db"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Plus, Music, ChevronLeft } from "lucide-react"

export default async function SongsPage() {
  const songs = await db.song.findMany({
    include: { arrangements: true },
    orderBy: { title: "asc" },
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin/services" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
            <ChevronLeft className="h-4 w-4" /> Services
          </Link>
          <h1 className="text-2xl font-bold">Song Library</h1>
        </div>
        <Button asChild>
          <Link href="/admin/songs/new">
            <Plus className="h-4 w-4 mr-1" /> New Song
          </Link>
        </Button>
      </div>

      {songs.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Music className="h-10 w-10 mx-auto mb-2 opacity-30" />
          <p>No songs yet. Add your first song.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border divide-y">
          {songs.map((song) => (
            <Link
              key={song.id}
              href={`/admin/songs/${song.id}`}
              className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
            >
              <div>
                <p className="font-medium">{song.title}</p>
                <p className="text-sm text-muted-foreground">
                  {song.author ?? "Unknown"} {song.genre ? `· ${song.genre}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{song.arrangements.length} arr.</Badge>
                {song.tags.slice(0, 2).map((t) => (
                  <Badge key={t} variant="outline" className="text-xs">{t}</Badge>
                ))}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
