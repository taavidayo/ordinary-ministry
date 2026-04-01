import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string; checklistId: string; itemId: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { itemId } = await params
  const data = await req.json()
  const item = await db.teamChecklistItem.update({
    where: { id: itemId },
    data: {
      ...(data.content !== undefined && { content: data.content }),
      ...(data.isHeader !== undefined && { isHeader: !!data.isHeader }),
      ...(data.roleId !== undefined && { roleId: data.roleId || null }),
      ...(data.order !== undefined && { order: data.order }),
    },
    include: { role: { select: { id: true, name: true } } },
  })
  return NextResponse.json(item)
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string; checklistId: string; itemId: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { itemId } = await params
  await db.teamChecklistItem.delete({ where: { id: itemId } })
  return NextResponse.json({ ok: true })
}
