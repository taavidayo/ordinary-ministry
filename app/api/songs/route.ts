import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"

export async function GET() {
  const songs = await db.song.findMany({
    include: { arrangements: true },
    orderBy: { title: "asc" },
  })
  return NextResponse.json(songs)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const { title, author, genre, tags } = body

  if (!title) return NextResponse.json({ error: "Title required" }, { status: 400 })

  const song = await db.song.create({
    data: { title, author, genre, tags: tags ?? [] },
  })
  return NextResponse.json(song, { status: 201 })
}
