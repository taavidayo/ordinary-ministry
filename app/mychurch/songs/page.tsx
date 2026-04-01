import { db } from "@/lib/db"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Plus, Music } from "lucide-react"
import ServicesBottomNav from "@/components/admin/ServicesBottomNav"

export default async function SongsPage() {
  const songs = await db.song.findMany({
    include: { arrangements: true },
    orderBy: { title: "asc" },
  })

  return (
    <div className="space-y-4 pb-24 md:pb-0">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Song Library</h1>
        <Button asChild>
          <Link href="/mychurch/songs/new">
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
        <div className="bg-card rounded-lg border divide-y">
          {songs.map((song) => (
            <Link
              key={song.id}
              href={`/mychurch/songs/${song.id}`}
              className="flex items-center justify-between px-4 py-3 hover:bg-accent/50 transition-colors"
            >
              <div>
                <p className="font-medium">{song.title}</p>
                <p className="text-sm text-muted-foreground">
                  {song.author ?? "Unknown"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{song.arrangements.length} arr.</Badge>
              </div>
            </Link>
          ))}
        </div>
      )}

      <ServicesBottomNav active="songs" />
    </div>
  )
}
