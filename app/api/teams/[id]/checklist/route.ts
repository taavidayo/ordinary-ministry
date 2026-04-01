import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"

// Legacy route: redirect to new checklists API
// Items are now grouped under TeamChecklist; return all items across all checklists for this team
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params
  const checklists = await db.teamChecklist.findMany({
    where: { teamId: id },
    include: {
      items: { orderBy: { order: "asc" } },
    },
    orderBy: { order: "asc" },
  })
  const items = checklists.flatMap((cl) => cl.items)
  return NextResponse.json(items)
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params
  const { content } = await req.json()
  if (!content) return NextResponse.json({ error: "content required" }, { status: 400 })
  // Find or create a default checklist for this team
  let checklist = await db.teamChecklist.findFirst({ where: { teamId: id }, orderBy: { order: "asc" } })
  if (!checklist) {
    const count = await db.teamChecklist.count({ where: { teamId: id } })
    checklist = await db.teamChecklist.create({ data: { teamId: id, name: "Default", order: count } })
  }
  const itemCount = await db.teamChecklistItem.count({ where: { checklistId: checklist.id } })
  const item = await db.teamChecklistItem.create({
    data: { checklistId: checklist.id, content, order: itemCount },
  })
  return NextResponse.json(item, { status: 201 })
}
