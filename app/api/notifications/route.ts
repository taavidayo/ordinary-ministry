import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const userId = session.user.id

  const [pendingSlots, announcements, upcomingEvents] = await Promise.all([
    db.serviceSlot.findMany({
      where: { userId, status: "PENDING" },
      include: {
        role: { select: { name: true } },
        serviceTeam: {
          include: {
            team: { select: { name: true } },
            service: { select: { id: true, title: true, date: true } },
          },
        },
      },
      take: 10,
      orderBy: { serviceTeam: { service: { date: "asc" } } },
    }),

    db.announcement.findMany({
      where: {
        createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
      include: { author: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),

    db.event.findMany({
      where: { startDate: { gte: new Date() } },
      orderBy: { startDate: "asc" },
      take: 5,
      select: { id: true, title: true, startDate: true, location: true },
    }),
  ])

  return NextResponse.json({
    pendingSlots: pendingSlots.map((s) => ({
      id: s.id,
      status: s.status,
      role: s.role,
      serviceTeam: {
        team: s.serviceTeam.team,
        service: {
          id: s.serviceTeam.service.id,
          title: s.serviceTeam.service.title,
          date: s.serviceTeam.service.date.toISOString(),
        },
      },
    })),
    announcements: announcements.map((a) => ({
      id: a.id,
      title: a.title,
      body: a.body,
      authorName: a.author.name,
      createdAt: a.createdAt.toISOString(),
    })),
    upcomingEvents: upcomingEvents.map((e) => ({
      id: e.id,
      title: e.title,
      startDate: e.startDate.toISOString(),
      location: e.location,
    })),
  })
}
