import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"

export async function PATCH(req: Request, { params }: { params: Promise<{ serviceTeamId: string; itemId: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { itemId } = await params
  const { done, content } = await req.json()
  const data: Record<string, unknown> = {}
  if (done !== undefined) data.done = done
  if (content !== undefined) data.content = content
  const item = await db.serviceChecklistItem.update({ where: { id: itemId }, data })
  return NextResponse.json(item)
}

export async function DELETE(_: Request, { params }: { params: Promise<{ serviceTeamId: string; itemId: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { itemId } = await params
  await db.serviceChecklistItem.delete({ where: { id: itemId } })
  return NextResponse.json({ ok: true })
}
