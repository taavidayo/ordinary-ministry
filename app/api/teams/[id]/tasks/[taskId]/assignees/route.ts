import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"

export async function POST(req: Request, { params }: { params: Promise<{ id: string; taskId: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { taskId } = await params
  const { userId } = await req.json()
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 })
  const assignee = await db.teamTaskAssignee.upsert({
    where: { taskId_userId: { taskId, userId } },
    create: { taskId, userId },
    update: {},
    include: { user: { select: { id: true, name: true, avatar: true } } },
  })
  return NextResponse.json(assignee, { status: 201 })
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string; taskId: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { taskId } = await params
  const { userId } = await req.json()
  await db.teamTaskAssignee.deleteMany({ where: { taskId, userId } })
  return NextResponse.json({ ok: true })
}
