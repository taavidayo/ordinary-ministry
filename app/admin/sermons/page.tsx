import { db } from "@/lib/db"
import AdminSermonsManager from "@/components/admin/SermonsManager"

export default async function AdminSermonsPage() {
  const [sermons, playlists] = await Promise.all([
    db.sermon.findMany({
      orderBy: { date: "desc" },
      include: { playlist: { select: { id: true, name: true } } },
    }),
    db.sermonPlaylist.findMany({
      orderBy: { createdAt: "asc" },
      include: { _count: { select: { sermons: true } } },
    }),
  ])

  const serializedPlaylists = playlists.map((p) => ({
    ...p,
    createdAt: p.createdAt.toISOString(),
    lastSyncedAt: p.lastSyncedAt?.toISOString() ?? null,
  }))

  return (
    <AdminSermonsManager
      sermons={sermons}
      playlists={serializedPlaylists}
    />
  )
}
