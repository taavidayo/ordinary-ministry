import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string; statusId: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { statusId } = await params
  const { name, color, order } = await req.json()
  const data: Record<string, unknown> = {}
  if (name !== undefined) data.name = name.trim()
  if (color !== undefined) data.color = color
  if (order !== undefined) data.order = order
  const status = await db.taskStatus.update({ where: { id: statusId }, data })
  return NextResponse.json(status)
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string; statusId: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { statusId } = await params
  await db.taskStatus.delete({ where: { id: statusId } })
  return NextResponse.json({ ok: true })
}
