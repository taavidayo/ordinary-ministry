import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"

export async function POST(req: Request, { params }: { params: Promise<{ id: string; checklistId: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { checklistId } = await params
  const { content, roleId, isHeader } = await req.json()
  if (!content?.trim()) return NextResponse.json({ error: "content required" }, { status: 400 })
  const count = await db.teamChecklistItem.count({ where: { checklistId } })
  const item = await db.teamChecklistItem.create({
    data: { checklistId, content: content.trim(), isHeader: !!isHeader, roleId: isHeader ? null : (roleId || null), order: count },
    include: { role: { select: { id: true, name: true } } },
  })
  return NextResponse.json(item, { status: 201 })
}
