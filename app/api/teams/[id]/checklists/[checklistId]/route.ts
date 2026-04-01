import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string; checklistId: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { checklistId } = await params
  const data = await req.json()
  const checklist = await db.teamChecklist.update({
    where: { id: checklistId },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.categoryId !== undefined && { categoryId: data.categoryId || null }),
      ...(data.order !== undefined && { order: data.order }),
    },
    include: {
      items: { include: { role: { select: { id: true, name: true } } }, orderBy: { order: "asc" } },
      category: { select: { id: true, name: true, color: true } },
    },
  })
  return NextResponse.json(checklist)
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string; checklistId: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { checklistId } = await params
  await db.teamChecklist.delete({ where: { id: checklistId } })
  return NextResponse.json({ ok: true })
}
