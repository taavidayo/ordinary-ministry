import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"

export async function GET(_: Request, { params }: { params: Promise<{ id: string; taskId: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { taskId } = await params
  const comments = await db.teamTaskComment.findMany({
    where: { taskId },
    include: { author: { select: { id: true, name: true, avatar: true } } },
    orderBy: { createdAt: "asc" },
  })
  return NextResponse.json(comments)
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string; taskId: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { taskId } = await params
  const { content, parentId } = await req.json()
  if (!content?.trim()) return NextResponse.json({ error: "content required" }, { status: 400 })
  const comment = await db.teamTaskComment.create({
    data: { taskId, authorId: session.user.id as string, content: content.trim(), parentId: parentId || null },
    include: { author: { select: { id: true, name: true, avatar: true } } },
  })
  return NextResponse.json(comment, { status: 201 })
}
