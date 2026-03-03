import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"

export async function GET() {
  const sermons = await db.sermon.findMany({ orderBy: { date: "desc" } })
  return NextResponse.json(sermons)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const { title, speaker, date, description, videoUrl, audioUrl, thumbnail, slug } = body
  if (!title || !speaker || !date || !slug)
    return NextResponse.json({ error: "title, speaker, date, slug required" }, { status: 400 })

  const sermon = await db.sermon.create({
    data: { title, speaker, date: new Date(date), description, videoUrl, audioUrl, thumbnail, slug },
  })
  return NextResponse.json(sermon, { status: 201 })
}
