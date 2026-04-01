import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const { songId, name, chordproText, lengthSeconds } = body

  if (!songId || !name || !chordproText)
    return NextResponse.json({ error: "songId, name, chordproText required" }, { status: 400 })

  const arrangement = await db.arrangement.create({
    data: { songId, name, chordproText, lengthSeconds: lengthSeconds ?? null },
  })
  return NextResponse.json(arrangement, { status: 201 })
}
