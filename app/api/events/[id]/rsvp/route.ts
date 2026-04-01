import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"

// GET — admin: list all RSVPs for an event
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const rsvps = await db.eventRsvp.findMany({
    where: { eventId: id },
    orderBy: { createdAt: "asc" },
    include: { user: { select: { id: true, name: true, email: true, avatar: true } } },
  })
  return NextResponse.json(rsvps)
}

// POST — toggle RSVP (for authenticated users) or submit with name/email (anonymous)
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const event = await db.event.findUnique({ where: { id }, select: { rsvpEnabled: true } })
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (!event.rsvpEnabled) return NextResponse.json({ error: "RSVP not enabled for this event" }, { status: 400 })

  const session = await auth()

  if (session?.user?.id) {
    const userId = session.user.id as string
    // Toggle: remove if exists, add if not
    const existing = await db.eventRsvp.findFirst({ where: { eventId: id, userId } })
    if (existing) {
      await db.eventRsvp.delete({ where: { id: existing.id } })
      return NextResponse.json({ action: "removed" })
    }
    const user = await db.user.findUnique({ where: { id: userId }, select: { name: true, email: true } })
    const rsvp = await db.eventRsvp.create({
      data: { eventId: id, userId, name: user!.name, email: user!.email },
    })
    return NextResponse.json({ action: "added", rsvp }, { status: 201 })
  }

  // Anonymous fallback — name not required
  const rsvp = await db.eventRsvp.create({
    data: { eventId: id },
  })
  return NextResponse.json({ action: "added", rsvp }, { status: 201 })
}
