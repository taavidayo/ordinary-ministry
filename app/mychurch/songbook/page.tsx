import { db } from "@/lib/db"
import SwipeableSongbook from "@/components/songbook/SwipeableSongbook"

export default async function SongbookPage({
  searchParams,
}: {
  searchParams: Promise<{ serviceId?: string }>
}) {
  const { serviceId } = await searchParams

  let serviceInfo: { title: string; date: Date } | null = null
  let songs: {
    id: string
    arrangementId: string
    title: string
    author: string | null
    arrangement: {
      name: string
      chordproText: string
      bpm?: number | null
      meter?: string | null
      sequence?: string[]
    }
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
              include: {
                song: true,
                arrangement: { select: { name: true, chordproText: true, bpm: true, meter: true, sequence: true } },
              },
              orderBy: { order: "asc" },
            },
          },
        },
      },
    })
    if (service) {
      serviceInfo = { title: service.title, date: service.date }
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
              arrangement: {
                name: item.arrangement.name,
                chordproText: item.arrangement.chordproText,
                bpm: item.arrangement.bpm,
                meter: item.arrangement.meter,
                sequence: (item.arrangement.sequence as string[] | null) ?? undefined,
              },
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
        arrangement: {
          name: s.arrangements[0].name,
          chordproText: s.arrangements[0].chordproText,
          bpm: s.arrangements[0].bpm,
          meter: s.arrangements[0].meter,
          sequence: (s.arrangements[0].sequence as string[] | null) ?? undefined,
        },
      }))
  }

  return (
    <div className="-m-6">
      <SwipeableSongbook
        songs={songs}
        serviceId={serviceId}
        serviceTitle={serviceInfo?.title ?? undefined}
        serviceDate={serviceInfo?.date.toISOString() ?? undefined}
      />
    </div>
  )
}
