import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"

// GET: return all ServiceChecklistItems for a service, optionally filtered by userId
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get("userId")

  // Get all service teams for this service
  const serviceTeams = await db.serviceTeam.findMany({
    where: { serviceId: id },
    include: {
      team: { select: { id: true, name: true } },
      checklistItems: {
        include: {
          role: { select: { id: true, name: true } },
          completedBy: { select: { id: true, name: true } },
        },
        orderBy: [{ templateChecklistId: "asc" }, { order: "asc" }],
      },
      slots: {
        select: { userId: true, roleId: true },
      },
    },
  })

  // If userId provided, filter items to only those assigned to a role the user is in
  if (userId) {
    const result = serviceTeams.map(st => {
      const userRoleIds = new Set(st.slots.filter(s => s.userId === userId).map(s => s.roleId))
      return {
        ...st,
        checklistItems: st.checklistItems.filter(item => !item.roleId || userRoleIds.has(item.roleId)),
      }
    })
    return NextResponse.json(result)
  }

  return NextResponse.json(serviceTeams)
}
