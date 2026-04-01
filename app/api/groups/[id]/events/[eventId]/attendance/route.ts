import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"

export async function GET(_req: Request, { params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params
  const attendance = await db.groupAttendance.findMany({
    where: { groupEventId: eventId },
    include: { user: { select: { id: true, name: true, avatar: true } } },
  })
  return NextResponse.json(attendance)
}

export async function POST(req: Request, { params }: { params: Promise<{ eventId: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { eventId } = await params
  const { userId, present, note } = await req.json()
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 })

  const record = await db.groupAttendance.upsert({
    where: { groupEventId_userId: { groupEventId: eventId, userId } },
    create: { groupEventId: eventId, userId, present: present ?? true, note: note ?? null },
    update: { present: present ?? true, note: note ?? null },
    include: { user: { select: { id: true, name: true, avatar: true } } },
  })
  return NextResponse.json(record, { status: 201 })
}
