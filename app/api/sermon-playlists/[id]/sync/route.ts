import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import { fetchPlaylistItems } from "@/lib/youtube"

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")
}

function parseTitle(raw: string): string {
  const before = raw.split("|")[0]
  return before.trim() || "Untitled"
}

function parseSpeaker(raw: string, fallback: string): string {
  const parts = raw.split("|")
  // text after the second "|" (index 2)
  if (parts.length >= 3 && parts[2].trim()) return parts[2].trim()
  return fallback
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const body = await req.json().catch(() => ({}))
  const force: boolean = body?.force === true

  const playlist = await db.sermonPlaylist.findUnique({ where: { id } })
  if (!playlist) return NextResponse.json({ error: "Playlist not found" }, { status: 404 })

  let items: { id: string; title: string; thumbnail: string | null }[]
  try {
    items = await fetchPlaylistItems(playlist.youtubePlaylistId)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: `Could not fetch playlist: ${msg}` }, { status: 502 })
  }

  // Get existing sermons for this playlist
  const existing = await db.sermon.findMany({
    where: { playlistId: id, youtubeVideoId: { not: null } },
    select: { id: true, youtubeVideoId: true },
  })
  const existingMap = new Map(existing.map((s) => [s.youtubeVideoId!, s.id]))

  let imported = 0
  let updated = 0

  for (const item of items) {
    if (!item.id) continue
    const rawTitle = item.title || ""
    const title = parseTitle(rawTitle)
    const speaker = parseSpeaker(rawTitle, playlist.defaultSpeaker || "Unknown")
    const thumbnail = item.thumbnail ?? null

    if (existingMap.has(item.id)) {
      // If force re-sync, update title/speaker on existing sermons
      if (force) {
        await db.sermon.update({
          where: { id: existingMap.get(item.id)! },
          data: { title, speaker, thumbnail },
        })
        updated++
      }
    } else {
      // New video — import it
      const date = new Date()
      const baseSlug = slugify(
        `${title}-${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
      )
      let slug = baseSlug
      let suffix = 1
      while (await db.sermon.findUnique({ where: { slug } })) {
        slug = `${baseSlug}-${suffix++}`
      }

      await db.sermon.create({
        data: {
          title,
          speaker,
          date,
          videoUrl: `https://www.youtube.com/embed/${item.id}`,
          thumbnail,
          slug,
          youtubeVideoId: item.id,
          playlistId: id,
        },
      })
      imported++
    }
  }

  const updatedPlaylist = await db.sermonPlaylist.update({
    where: { id },
    data: { lastSyncedAt: new Date() },
    include: { _count: { select: { sermons: true } } },
  })

  return NextResponse.json({ imported, updated, total: items.length, playlist: updatedPlaylist })
}
