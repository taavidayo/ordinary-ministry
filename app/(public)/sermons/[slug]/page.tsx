export const dynamic = "force-dynamic"

import { db } from "@/lib/db"
import { notFound } from "next/navigation"

export default async function SermonPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const sermon = await db.sermon.findUnique({ where: { slug } })
  if (!sermon) notFound()

  return (
    <div className="max-w-3xl mx-auto px-4 py-16">
      <p className="text-sm text-muted-foreground mb-2">
        {new Date(sermon.date).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
      </p>
      <h1 className="text-3xl font-bold mb-1">{sermon.title}</h1>
      <p className="text-muted-foreground mb-6">{sermon.speaker}</p>

      {sermon.videoUrl && (
        <div className="aspect-video mb-6">
          <iframe
            src={sermon.videoUrl}
            className="w-full h-full rounded-lg"
            allowFullScreen
          />
        </div>
      )}

      {sermon.audioUrl && (
        <audio controls className="w-full mb-6">
          <source src={sermon.audioUrl} />
        </audio>
      )}

      {sermon.description && <p className="text-lg leading-relaxed">{sermon.description}</p>}
    </div>
  )
}
