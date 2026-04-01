import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"

export async function GET(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const teamId = searchParams.get("teamId")

  // Get recent services (last 10) that have checklist items
  const services = await db.service.findMany({
    where: {
      date: { lte: new Date() },
      ...(teamId && { teams: { some: { teamId } } }),
    },
    orderBy: { date: "desc" },
    take: 10,
    select: {
      id: true,
      title: true,
      date: true,
      teams: {
        select: {
          checklistItems: { select: { id: true, done: true } },
        },
      },
    },
  })

  const result = services
    .map(s => {
      const allItems = s.teams.flatMap(t => t.checklistItems)
      return {
        id: s.id,
        title: s.title,
        date: s.date.toISOString(),
        total: allItems.length,
        done: allItems.filter(i => i.done).length,
      }
    })
    .filter(s => s.total > 0)

  return NextResponse.json(result)
}
