import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"

// GET /api/availability
//   ?date=YYYY-MM-DD              → userIds blocked on that date (service planner)
//   ?from=YYYY-MM-DD&to=YYYY-MM-DD → current user's blockouts in a date range
export async function GET(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const dateStr = searchParams.get("date")
  const fromStr = searchParams.get("from")
  const toStr = searchParams.get("to")

  if (fromStr && toStr) {
    const records = await db.availability.findMany({
      where: {
        userId: session.user.id as string,
        date: { gte: new Date(fromStr), lte: new Date(toStr) },
      },
      orderBy: { date: "asc" },
    })
    return NextResponse.json(records)
  }

  if (!dateStr) return NextResponse.json([])
  const date = new Date(dateStr)
  const records = await db.availability.findMany({
    where: { date },
    select: { id: true, userId: true, note: true },
  })
  return NextResponse.json(records)
}

// POST /api/availability — upsert a blockout for the current user
export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { userId, date, note, allDay, startTime, endTime } = await req.json()
  const data = {
    note: note ?? null,
    allDay: allDay !== false,
    startTime: allDay !== false ? null : (startTime ?? null),
    endTime: allDay !== false ? null : (endTime ?? null),
  }
  const record = await db.availability.upsert({
    where: { userId_date: { userId, date: new Date(date) } },
    update: data,
    create: { userId, date: new Date(date), ...data },
  })
  return NextResponse.json(record, { status: 201 })
}
