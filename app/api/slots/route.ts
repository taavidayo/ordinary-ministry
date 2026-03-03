import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { serviceTeamId, roleId, userId } = await req.json()

  // Reuse an existing unassigned slot for this role before creating a new one
  const existing = await db.serviceSlot.findFirst({
    where: { serviceTeamId, roleId, userId: null },
  })

  if (existing) {
    const slot = await db.serviceSlot.update({
      where: { id: existing.id },
      data: { userId },
      include: { role: true, user: true },
    })
    return NextResponse.json(slot)
  }

  const slot = await db.serviceSlot.create({
    data: { serviceTeamId, roleId, userId },
    include: { role: true, user: true },
  })
  return NextResponse.json(slot, { status: 201 })
}
