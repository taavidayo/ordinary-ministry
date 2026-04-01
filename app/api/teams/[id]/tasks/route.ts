import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params
  const tasks = await db.teamTask.findMany({
    where: { teamId: id, projectId: null, parentId: null },
    include: {
      assignedTo: { select: { id: true, name: true } },
      assignees: { include: { user: { select: { id: true, name: true, avatar: true } } } },
      status: true,
      subtasks: { include: { assignees: { include: { user: { select: { id: true, name: true, avatar: true } } } }, status: true } },
      comments: { include: { author: { select: { id: true, name: true, avatar: true } } }, orderBy: { createdAt: "asc" } },
    },
    orderBy: { createdAt: "asc" },
  })
  return NextResponse.json(tasks)
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params
  const body = await req.json()
  const { content, assignedToId, dueDate, projectId, description, priority, statusId, parentId } = body
  if (!content) return NextResponse.json({ error: "content required" }, { status: 400 })
  const task = await db.teamTask.create({
    data: {
      teamId: id,
      content,
      description: description || null,
      assignedToId: assignedToId || null,
      dueDate: dueDate ? new Date(dueDate) : null,
      projectId: projectId || null,
      priority: priority || "none",
      statusId: statusId || null,
      parentId: parentId || null,
    },
    include: {
      assignedTo: { select: { id: true, name: true } },
      assignees: { include: { user: { select: { id: true, name: true, avatar: true } } } },
      status: true,
      subtasks: true,
      comments: true,
    },
  })
  return NextResponse.json(task, { status: 201 })
}
