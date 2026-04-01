import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const events = await db.groupEvent.findMany({
    where: { groupId: id },
    include: {
      attendance: { include: { user: { select: { id: true, name: true, avatar: true } } } },
    },
    orderBy: { startDate: "asc" },
  })
  return NextResponse.json(events)
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const { title, description, startDate, endDate, recurrence, recurrenceEndDate } = body

  if (!title?.trim()) return NextResponse.json({ error: "title required" }, { status: 400 })
  if (!startDate) return NextResponse.json({ error: "startDate required" }, { status: 400 })

  const event = await db.groupEvent.create({
    data: {
      groupId: id,
      title: title.trim(),
      description: description ?? null,
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : null,
      recurrence: recurrence ?? "NONE",
      recurrenceEndDate: recurrenceEndDate ? new Date(recurrenceEndDate) : null,
    },
    include: {
      attendance: { include: { user: { select: { id: true, name: true, avatar: true } } } },
    },
  })
  return NextResponse.json(event, { status: 201 })
}
