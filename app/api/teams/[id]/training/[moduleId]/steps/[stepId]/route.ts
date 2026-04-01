import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string; moduleId: string; stepId: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { stepId } = await params
  const body = await req.json()
  const { title, content, order } = body

  const data: Record<string, unknown> = {}
  if (title !== undefined) data.title = title
  if (content !== undefined) data.content = content
  if (order !== undefined) data.order = order

  const step = await db.teamTrainingStep.update({
    where: { id: stepId },
    data,
    include: { completions: true },
  })
  return NextResponse.json(step)
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string; moduleId: string; stepId: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { stepId } = await params
  await db.teamTrainingStep.delete({ where: { id: stepId } })
  return NextResponse.json({ ok: true })
}
