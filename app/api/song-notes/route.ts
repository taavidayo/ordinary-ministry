import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"

export async function GET(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const arrangementId = searchParams.get("arrangementId")
  if (!arrangementId) return NextResponse.json({ error: "arrangementId required" }, { status: 400 })

  const note = await db.songNote.findUnique({
    where: { userId_arrangementId: { userId: session.user!.id as string, arrangementId } },
  })
  return NextResponse.json({ content: note?.content ?? "" })
}

export async function PUT(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { arrangementId, content } = await req.json()
  const userId = session.user!.id as string

  const note = await db.songNote.upsert({
    where: { userId_arrangementId: { userId, arrangementId } },
    create: { userId, arrangementId, content },
    update: { content },
  })
  return NextResponse.json(note)
}
