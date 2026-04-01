import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const userId = session.user.id

  const [memberships, pendingSlots, recentAnnouncements] = await Promise.all([
    // Get all channel memberships with lastRead info
    db.channelMember.findMany({
      where: { userId },
      select: {
        channelId: true,
        lastRead: true,
        channel: {
          select: {
            archivedAt: true,
            _count: { select: { messages: true } },
          },
        },
      },
    }),

    // Pending service slot assignments for this user
    db.serviceSlot.count({
      where: { userId, status: "PENDING" },
    }),

    // Announcements from the last 7 days
    db.announcement.count({
      where: {
        createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
    }),
  ])

  // Count channels with unread messages
  let chatUnread = 0
  const activeMembers = memberships.filter((m) => !m.channel.archivedAt)

  for (const m of activeMembers) {
    if (m.channel._count.messages === 0) continue
    if (!m.lastRead) {
      // Never read — count as unread if there are any messages
      chatUnread++
    } else {
      // Count messages newer than lastRead
      const count = await db.message.count({
        where: {
          channelId: m.channelId,
          createdAt: { gt: m.lastRead },
          deletedAt: null,
        },
      })
      if (count > 0) chatUnread++
    }
  }

  return NextResponse.json({
    chat: chatUnread,
    notifications: pendingSlots + recentAnnouncements,
  })
}
