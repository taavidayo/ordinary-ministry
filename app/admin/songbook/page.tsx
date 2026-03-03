import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import SwipeableSongbook from "@/components/songbook/SwipeableSongbook"

export default async function SongbookPage({
  searchParams,
}: {
  searchParams: Promise<{ serviceId?: string }>
}) {
  const { serviceId } = await searchParams

  let songs: {
    id: string
    arrangementId: string
    title: string
    author: string | null
    arrangement: { name: string; chordproText: string }
  }[] = []

  if (serviceId) {
    const service = await db.service.findUnique({
      where: { id: serviceId },
      include: {
        times: {
          orderBy: { order: "asc" },
          include: {
            items: {
              where: { type: "SONG" },
              include: { song: true, arrangement: true },
              orderBy: { order: "asc" },
            },
          },
        },
      },
    })
    if (service) {
      const seen = new Set<string>()
      for (const time of service.times) {
        for (const item of time.items) {
          if (item.song && item.arrangement && !seen.has(item.arrangementId!)) {
            seen.add(item.arrangementId!)
            songs.push({
              id: item.id,
              arrangementId: item.arrangementId!,
              title: item.song.title,
              author: item.song.author,
              arrangement: { name: item.arrangement.name, chordproText: item.arrangement.chordproText },
            })
          }
        }
      }
    }
  } else {
    const allSongs = await db.song.findMany({
      include: { arrangements: { take: 1, orderBy: { createdAt: "asc" } } },
      orderBy: { title: "asc" },
    })
    songs = allSongs
      .filter((s) => s.arrangements.length > 0)
      .map((s) => ({
        id: s.id,
        arrangementId: s.arrangements[0].id,
        title: s.title,
        author: s.author,
        arrangement: { name: s.arrangements[0].name, chordproText: s.arrangements[0].chordproText },
      }))
  }

  // Fetch existing notes for the current user
  const session = await auth()
  let initialNotes: Record<string, string> = {}
  if (session?.user?.id && songs.length > 0) {
    const arrangementIds = songs.map((s) => s.arrangementId)
    const notes = await db.songNote.findMany({
      where: { userId: session.user.id as string, arrangementId: { in: arrangementIds } },
    })
    for (const note of notes) {
      initialNotes[note.arrangementId] = note.content
    }
  }

  return (
    <div className="-m-6">
      <SwipeableSongbook songs={songs} initialNotes={initialNotes} />
    </div>
  )
}
