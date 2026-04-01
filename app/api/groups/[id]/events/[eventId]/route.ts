import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string; eventId: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { eventId } = await params
  const body = await req.json()
  const { title, description, startDate, endDate, recurrence, recurrenceEndDate } = body

  const event = await db.groupEvent.update({
    where: { id: eventId },
    data: {
      ...(title !== undefined && { title }),
      ...(description !== undefined && { description }),
      ...(startDate !== undefined && { startDate: new Date(startDate) }),
      ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
      ...(recurrence !== undefined && { recurrence }),
      ...(recurrenceEndDate !== undefined && { recurrenceEndDate: recurrenceEndDate ? new Date(recurrenceEndDate) : null }),
    },
    include: {
      attendance: { include: { user: { select: { id: true, name: true, avatar: true } } } },
    },
  })
  return NextResponse.json(event)
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string; eventId: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { eventId } = await params
  await db.groupEvent.delete({ where: { id: eventId } })
  return NextResponse.json({ ok: true })
}
