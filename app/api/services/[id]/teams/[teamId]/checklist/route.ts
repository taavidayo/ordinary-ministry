import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"

// POST: assign a TeamChecklist to a ServiceTeam — creates ServiceChecklistItems from template
export async function POST(req: Request, { params }: { params: Promise<{ id: string; teamId: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { teamId: serviceTeamId } = await params
    const { checklistId } = await req.json()
    if (!checklistId) return NextResponse.json({ error: "checklistId required" }, { status: 400 })

    // Load the template checklist items
    const checklist = await db.teamChecklist.findUnique({
      where: { id: checklistId },
      include: { items: { orderBy: { order: "asc" } } },
    })
    if (!checklist) return NextResponse.json({ error: "Checklist not found" }, { status: 404 })

    // Remove any existing items from this checklist template first (idempotent)
    await db.serviceChecklistItem.deleteMany({ where: { serviceTeamId, templateChecklistId: checklistId } })

    // Create service checklist items from the template
    if (checklist.items.length > 0) {
      await db.serviceChecklistItem.createMany({
        data: checklist.items.map((item) => ({
          serviceTeamId,
          content: item.content,
          isHeader: item.isHeader,
          order: item.order,
          roleId: item.roleId ?? null,
          templateItemId: item.id,
          templateChecklistId: checklistId,
        })),
      })
    }

    // Return the created items with includes
    const items = await db.serviceChecklistItem.findMany({
      where: { serviceTeamId, templateChecklistId: checklistId },
      include: { role: { select: { id: true, name: true } }, completedBy: { select: { id: true, name: true } } },
      orderBy: { order: "asc" },
    })

    return NextResponse.json({ checklistId, name: checklist.name, items }, { status: 201 })
  } catch (e) {
    console.error("POST assign checklist error:", e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

// DELETE: unassign a checklist — removes all items for that template from this service team
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string; teamId: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { teamId: serviceTeamId } = await params
    const { checklistId } = await req.json()
    if (!checklistId) return NextResponse.json({ error: "checklistId required" }, { status: 400 })

    await db.serviceChecklistItem.deleteMany({ where: { serviceTeamId, templateChecklistId: checklistId } })
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error("DELETE unassign checklist error:", e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
