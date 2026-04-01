import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string; taskId: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { taskId } = await params
  const body = await req.json()
  const { content, description, done, assignedToId, dueDate, priority, statusId, parentId } = body
  const data: Record<string, unknown> = {}
  if (content !== undefined) data.content = content
  if (description !== undefined) data.description = description || null
  if (done !== undefined) data.done = done
  if (assignedToId !== undefined) data.assignedToId = assignedToId || null
  if (dueDate !== undefined) data.dueDate = dueDate ? new Date(dueDate) : null
  if (priority !== undefined) data.priority = priority
  if (statusId !== undefined) data.statusId = statusId || null
  if (parentId !== undefined) data.parentId = parentId || null
  const task = await db.teamTask.update({
    where: { id: taskId },
    data,
    include: {
      assignedTo: { select: { id: true, name: true } },
      assignees: { include: { user: { select: { id: true, name: true, avatar: true } } } },
      status: true,
      subtasks: { include: { assignees: { include: { user: { select: { id: true, name: true, avatar: true } } } }, status: true } },
      comments: { include: { author: { select: { id: true, name: true, avatar: true } } }, orderBy: { createdAt: "asc" } },
    },
  })
  return NextResponse.json(task)
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string; taskId: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { taskId } = await params
  await db.teamTask.delete({ where: { id: taskId } })
  return NextResponse.json({ ok: true })
}
