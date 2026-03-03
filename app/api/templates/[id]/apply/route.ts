import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id: templateId } = await params
  const { serviceId } = await req.json()

  const template = await db.serviceTemplate.findUnique({
    where: { id: templateId },
    include: {
      times: { orderBy: { order: "asc" }, include: { items: { orderBy: { order: "asc" } } } },
      templateTeams: { include: { team: { include: { roles: true } } } },
    },
  })
  if (!template) return NextResponse.json({ error: "Template not found" }, { status: 404 })

  // Map from templateTimeId → created ServiceTime id
  const timeIdMap: Record<string, string> = {}

  // Create service times + items sequentially (needed for FK references)
  for (const tTime of template.times) {
    const serviceTime = await db.serviceTime.create({
      data: {
        serviceId,
        label: tTime.label,
        startTime: tTime.startTime ?? null,
        order: tTime.order,
        items: {
          create: tTime.items.map((item) => ({
            type: item.type,
            name: item.name,
            order: item.order,
          })),
        },
      },
    })
    timeIdMap[tTime.id] = serviceTime.id
  }

  // Create service teams for each template team
  for (const tTeam of template.templateTeams) {
    const serviceTimeId = tTeam.templateTimeId ? timeIdMap[tTeam.templateTimeId] ?? null : null
    await db.serviceTeam.create({
      data: {
        serviceId,
        teamId: tTeam.teamId,
        serviceTimeId,
        slots: {
          create: tTeam.team.roles.map((r) => ({ roleId: r.id })),
        },
      },
    })
  }

  // Return the updated service
  const service = await db.service.findUnique({
    where: { id: serviceId },
    include: {
      times: {
        orderBy: { order: "asc" },
        include: { items: { include: { song: true, arrangement: true }, orderBy: { order: "asc" } } },
      },
      teams: { include: { team: true, slots: { include: { role: true, user: true } } } },
      scheduleEntries: { orderBy: { order: "asc" } },
      series: true,
    },
  })
  return NextResponse.json(service)
}
