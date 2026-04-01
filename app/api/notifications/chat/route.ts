import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const userId = session.user.id

  // Get channels the user is a member of (or public channels)
  const memberships = await db.channelMember.findMany({
    where: { userId },
    select: { channelId: true, lastRead: true },
  })

  const channelIds = memberships.map((m) => m.channelId)
  const lastReadMap = new Map(memberships.map((m) => [m.channelId, m.lastRead]))

  // Get channels with their latest message
  const channels = await db.channel.findMany({
    where: {
      id: { in: channelIds },
      archivedAt: null,
    },
    select: {
      id: true,
      name: true,
      icon: true,
      type: true,
      messages: {
        where: { deletedAt: null },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          id: true,
          content: true,
          createdAt: true,
          author: { select: { name: true, avatar: true } },
        },
      },
      _count: { select: { messages: { where: { deletedAt: null } } } },
    },
  })

  // Build unread channel previews
  const previews = channels
    .filter((c) => c.messages.length > 0)
    .map((c) => {
      const lastRead = lastReadMap.get(c.id)
      const latestMsg = c.messages[0]
      const isUnread = !lastRead || latestMsg.createdAt > lastRead
      return {
        channelId: c.id,
        channelName: c.name,
        channelIcon: c.icon,
        channelType: c.type,
        lastMessage: {
          content: latestMsg.content,
          createdAt: latestMsg.createdAt.toISOString(),
          authorName: latestMsg.author.name,
          authorAvatar: latestMsg.author.avatar,
        },
        isUnread,
      }
    })
    .sort((a, b) => {
      // Unread first, then by message time
      if (a.isUnread !== b.isUnread) return a.isUnread ? -1 : 1
      return new Date(b.lastMessage.createdAt).getTime() - new Date(a.lastMessage.createdAt).getTime()
    })
    .slice(0, 12)

  return NextResponse.json({ channels: previews })
}
