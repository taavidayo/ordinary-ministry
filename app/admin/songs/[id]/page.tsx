import { db } from "@/lib/db"
import { notFound } from "next/navigation"
import SongEditor from "@/components/admin/SongEditor"

export default async function SongPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const song = await db.song.findUnique({
    where: { id },
    include: { arrangements: { orderBy: { createdAt: "asc" } } },
  })
  if (!song) notFound()
  return <SongEditor song={song} />
}
