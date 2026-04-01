import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"

// GET — list announcements for an event
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const announcements = await db.eventAnnouncement.findMany({
    where: { eventId: id },
    orderBy: { sentAt: "desc" },
  })
  return NextResponse.json(announcements)
}

// POST — record a sent announcement (admin only)
// In a real app this would also send emails; here we just record it.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const { subject, message } = body
  if (!subject || !message) return NextResponse.json({ error: "subject and message required" }, { status: 400 })

  const announcement = await db.eventAnnouncement.create({
    data: { eventId: id, subject, message },
  })
  return NextResponse.json(announcement, { status: 201 })
}
