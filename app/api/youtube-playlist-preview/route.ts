import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { fetchPlaylistInfo } from "@/lib/youtube"

function extractPlaylistId(input: string): string {
  const trimmed = input.trim()
  try {
    const url = new URL(trimmed)
    const list = url.searchParams.get("list")
    if (list) return list
  } catch {
    // Not a URL — treat as raw ID
  }
  return trimmed
}

export async function GET(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const raw = searchParams.get("playlistId")
  if (!raw) return NextResponse.json({ error: "playlistId required" }, { status: 400 })

  const playlistId = extractPlaylistId(raw)

  try {
    const info = await fetchPlaylistInfo(playlistId)
    return NextResponse.json(info)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    const isNotFound = msg.toLowerCase().includes("not found") || msg.toLowerCase().includes("private") || msg.toLowerCase().includes("404")
    return NextResponse.json(
      { error: isNotFound ? "Playlist not found or is private" : `Could not fetch playlist: ${msg}` },
      { status: isNotFound ? 404 : 502 }
    )
  }
}
