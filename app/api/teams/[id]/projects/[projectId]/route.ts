import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string; projectId: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { projectId } = await params
  const { name, description, archived } = await req.json()
  const data: Record<string, unknown> = {}
  if (name !== undefined) data.name = name.trim()
  if (description !== undefined) data.description = description?.trim() || null
  if (archived !== undefined) data.archived = archived
  const project = await db.teamProject.update({
    where: { id: projectId },
    data,
    include: {
      tasks: {
        where: { parentId: null },
        include: {
          assignees: { include: { user: { select: { id: true, name: true, avatar: true } } } },
          assignedTo: { select: { id: true, name: true } },
          status: true,
          subtasks: { include: { assignees: { include: { user: { select: { id: true, name: true, avatar: true } } } }, status: true } },
          comments: { include: { author: { select: { id: true, name: true, avatar: true } } }, orderBy: { createdAt: "asc" } },
        },
        orderBy: { createdAt: "asc" },
      },
      comments: { include: { author: { select: { id: true, name: true, avatar: true } } }, orderBy: { createdAt: "asc" } },
    },
  })
  return NextResponse.json(project)
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string; projectId: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { projectId } = await params
  await db.teamProject.delete({ where: { id: projectId } })
  return NextResponse.json({ ok: true })
}
