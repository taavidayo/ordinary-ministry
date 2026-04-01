import { db } from "@/lib/db"
import { notFound } from "next/navigation"
import SongEditor from "@/components/admin/SongEditor"

export default async function SongPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const [song, recentItems] = await Promise.all([
    db.song.findUnique({
      where: { id },
      include: { arrangements: { orderBy: [{ order: "asc" }, { createdAt: "asc" }] } },
    }),
    db.programItem.findMany({
      where: { songId: id, type: "SONG" },
      include: {
        serviceTime: {
          include: {
            service: {
              select: { title: true, date: true, category: { select: { name: true, color: true } } },
            },
          },
        },
        arrangement: { select: { name: true } },
      },
      orderBy: { serviceTime: { service: { date: "desc" } } },
      take: 6,
    }),
  ])

  if (!song) notFound()

  const recentScheduled = recentItems.map((item) => ({
    date: item.serviceTime.service.date.toISOString(),
    serviceTitle: item.serviceTime.service.title,
    arrangementName: item.arrangement?.name ?? null,
    category: item.serviceTime.service.category
      ? { name: item.serviceTime.service.category.name, color: item.serviceTime.service.category.color }
      : null,
  }))

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <SongEditor song={song as any} recentScheduled={recentScheduled} />
}
