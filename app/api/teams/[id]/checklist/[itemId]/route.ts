import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string; itemId: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { itemId } = await params
  const { content, order } = await req.json()
  const data: Record<string, unknown> = {}
  if (content !== undefined) data.content = content
  if (order !== undefined) data.order = order
  const item = await db.teamChecklistItem.update({ where: { id: itemId }, data })
  return NextResponse.json(item)
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string; itemId: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { itemId } = await params
  await db.teamChecklistItem.delete({ where: { id: itemId } })
  return NextResponse.json({ ok: true })
}
