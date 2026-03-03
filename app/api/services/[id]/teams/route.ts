import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id: serviceId } = await params
  const { teamId, serviceTimeId } = await req.json()

  try {
    // Create service team with slots for each role
    const teamRoles = await db.teamRole.findMany({ where: { teamId } })
    const serviceTeam = await db.serviceTeam.create({
      data: {
        serviceId,
        teamId,
        serviceTimeId: serviceTimeId ?? null,
        slots: {
          create: teamRoles.map((r) => ({ roleId: r.id })),
        },
      },
      include: { team: true, slots: { include: { role: true, user: true } } },
    })
    return NextResponse.json(serviceTeam, { status: 201 })
  } catch (e) {
    console.error("POST /teams error:", e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
