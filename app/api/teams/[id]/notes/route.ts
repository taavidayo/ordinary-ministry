import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const notes = await db.teamNote.findMany({
    where: { teamId: id },
    include: {
      subject: { select: { id: true, name: true } },
      author: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  })
  return NextResponse.json(notes)
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const { subjectId, content } = body
  if (!subjectId || !content) return NextResponse.json({ error: "subjectId and content required" }, { status: 400 })

  const note = await db.teamNote.create({
    data: {
      teamId: id,
      subjectId,
      content,
      authorId: session.user.id,
    },
    include: {
      subject: { select: { id: true, name: true } },
      author: { select: { id: true, name: true } },
    },
  })
  return NextResponse.json(note, { status: 201 })
}
