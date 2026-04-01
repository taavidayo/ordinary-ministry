import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string; moduleId: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { moduleId } = await params
  const body = await req.json()
  const { title, description, order } = body

  const data: Record<string, unknown> = {}
  if (title !== undefined) data.title = title
  if (description !== undefined) data.description = description
  if (order !== undefined) data.order = order

  const module = await db.teamTrainingModule.update({
    where: { id: moduleId },
    data,
    include: {
      steps: { include: { completions: true }, orderBy: { order: "asc" } },
    },
  })
  return NextResponse.json(module)
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string; moduleId: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { moduleId } = await params
  await db.teamTrainingModule.delete({ where: { id: moduleId } })
  return NextResponse.json({ ok: true })
}
