import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string; noteId: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { noteId } = await params
  const body = await req.json()
  const { content } = body
  if (!content) return NextResponse.json({ error: "content required" }, { status: 400 })

  const note = await db.teamNote.update({
    where: { id: noteId },
    data: { content },
    include: {
      subject: { select: { id: true, name: true } },
      author: { select: { id: true, name: true } },
    },
  })
  return NextResponse.json(note)
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string; noteId: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { noteId } = await params
  await db.teamNote.delete({ where: { id: noteId } })
  return NextResponse.json({ ok: true })
}
