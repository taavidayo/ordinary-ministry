import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const checklists = await db.teamChecklist.findMany({
    where: { teamId: id },
    include: {
      items: {
        include: { role: { select: { id: true, name: true } } },
        orderBy: { order: "asc" },
      },
      category: { select: { id: true, name: true, color: true } },
    },
    orderBy: { order: "asc" },
  })
  return NextResponse.json(checklists)
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params
  const { name, categoryId } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: "name required" }, { status: 400 })
  const count = await db.teamChecklist.count({ where: { teamId: id } })
  const checklist = await db.teamChecklist.create({
    data: { teamId: id, name: name.trim(), categoryId: categoryId || null, order: count },
    include: {
      items: { include: { role: { select: { id: true, name: true } } }, orderBy: { order: "asc" } },
      category: { select: { id: true, name: true, color: true } },
    },
  })
  return NextResponse.json(checklist, { status: 201 })
}
