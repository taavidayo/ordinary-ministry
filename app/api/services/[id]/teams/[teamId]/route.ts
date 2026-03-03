import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"

// DELETE /api/services/[id]/teams/[teamId] — remove a service team and all its slots
export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ id: string; teamId: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { teamId } = await params
  await db.serviceTeam.delete({ where: { id: teamId } })
  return NextResponse.json({ ok: true })
}

// DELETE all slots for a specific role within a service team
// Called via query: DELETE /api/services/[id]/teams/[teamId]?roleId=xxx
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; teamId: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { teamId } = await params
  const { roleId } = await req.json()

  // Delete all slots for this role in this service team
  await db.serviceSlot.deleteMany({ where: { serviceTeamId: teamId, roleId } })
  return NextResponse.json({ ok: true })
}
