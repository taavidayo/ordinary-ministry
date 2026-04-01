import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"

export async function GET(_: Request, { params }: { params: Promise<{ serviceTeamId: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { serviceTeamId } = await params

  let items = await db.serviceChecklistItem.findMany({
    where: { serviceTeamId },
    orderBy: { order: "asc" },
  })

  // Auto-initialize from team template checklists if empty
  if (items.length === 0) {
    const serviceTeam = await db.serviceTeam.findUnique({
      where: { id: serviceTeamId },
      select: {
        team: {
          select: {
            checklists: {
              orderBy: { order: "asc" },
              include: {
                items: { orderBy: { order: "asc" } },
              },
            },
          },
        },
      },
    })
    const templateItems = serviceTeam?.team.checklists.flatMap((cl) =>
      cl.items.map((item) => ({ content: item.content, order: item.order, roleId: item.roleId, templateItemId: item.id }))
    ) ?? []
    if (templateItems.length > 0) {
      await db.serviceChecklistItem.createMany({
        data: templateItems.map((t) => ({
          serviceTeamId,
          content: t.content,
          order: t.order,
          roleId: t.roleId,
          templateItemId: t.templateItemId,
        })),
      })
      items = await db.serviceChecklistItem.findMany({
        where: { serviceTeamId },
        orderBy: { order: "asc" },
      })
    }
  }

  return NextResponse.json(items)
}

export async function POST(req: Request, { params }: { params: Promise<{ serviceTeamId: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { serviceTeamId } = await params
  const { content } = await req.json()
  if (!content) return NextResponse.json({ error: "content required" }, { status: 400 })
  const count = await db.serviceChecklistItem.count({ where: { serviceTeamId } })
  const item = await db.serviceChecklistItem.create({
    data: { serviceTeamId, content, order: count },
  })
  return NextResponse.json(item, { status: 201 })
}
