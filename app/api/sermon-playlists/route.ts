import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const playlists = await db.sermonPlaylist.findMany({
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { sermons: true } } },
  })
  return NextResponse.json(playlists)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { name, youtubePlaylistId, defaultSpeaker, autoSync } = await req.json()
  if (!name || !youtubePlaylistId)
    return NextResponse.json({ error: "name and youtubePlaylistId required" }, { status: 400 })

  try {
    const playlist = await db.sermonPlaylist.create({
      data: { name, youtubePlaylistId, defaultSpeaker: defaultSpeaker ?? "", autoSync: autoSync ?? true },
      include: { _count: { select: { sermons: true } } },
    })
    return NextResponse.json(playlist, { status: 201 })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    if (msg.includes("Unique constraint")) {
      return NextResponse.json({ error: "A playlist with that YouTube ID already exists" }, { status: 409 })
    }
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
