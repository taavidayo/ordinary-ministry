import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { redirect, notFound } from "next/navigation"
import ChatLayout from "@/components/admin/chat/ChatLayout"
import { aggregateReactions } from "@/lib/chat-utils"

export default async function ChannelPage({
  params,
}: {
  params: Promise<{ channelId: string }>
}) {
  const session = await auth()
  if (!session) redirect("/login")

  const { channelId } = await params
  const userId = session.user.id

  const [channel, activeChannels, archivedChannels, teams, categories] = await Promise.all([
    db.channel.findUnique({
      where: { id: channelId },
      include: {
        members: {
          include: { user: { select: { id: true, name: true, avatar: true } } },
        },
      },
    }),
    db.channel.findMany({
      where: {
        archivedAt: null,
        OR: [
          { type: "PUBLIC" },
          { type: "TEAM", team: { members: { some: { userId } } } },
          { type: "GROUP", group: { members: { some: { userId } } } },
          { type: "PRIVATE", members: { some: { userId } } },
        ],
      },
      include: {
        members: { where: { userId }, select: { userId: true, categoryId: true, order: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
    db.channel.findMany({
      where: {
        archivedAt: { not: null },
        OR: [
          { type: "PUBLIC" },
          { type: "TEAM", team: { members: { some: { userId } } } },
          { type: "GROUP", group: { members: { some: { userId } } } },
          { type: "PRIVATE", members: { some: { userId } } },
        ],
      },
      include: {
        members: { where: { userId }, select: { userId: true, categoryId: true, order: true } },
      },
      orderBy: { archivedAt: "desc" },
    }),
    db.team.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.chatCategory.findMany({
      where: { userId },
      orderBy: { order: "asc" },
    }),
  ])

  if (!channel) notFound()

  if (channel.type === "PRIVATE") {
    const isMember = channel.members.some((m) => m.userId === userId)
    if (!isMember) notFound()
  }

  const rawMessages = await db.message.findMany({
    where: { channelId, threadId: null },
    include: {
      author: { select: { id: true, name: true, avatar: true } },
      reactions: true,
      replies: { select: { id: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  })

  const initialMessages = [...rawMessages].reverse().map((m) => ({
    id: m.id,
    channelId: m.channelId,
    authorId: m.authorId,
    content: m.deletedAt ? "" : m.content,
    threadId: m.threadId,
    editedAt: m.editedAt?.toISOString() ?? null,
    deletedAt: m.deletedAt?.toISOString() ?? null,
    createdAt: m.createdAt.toISOString(),
    author: m.author,
    replyCount: m.replies.length,
    reactions: aggregateReactions(m.reactions),
  }))

  function mapChannel(c: typeof activeChannels[0]) {
    const membership = c.members[0]
    return {
      id: c.id,
      name: c.name,
      icon: c.icon,
      description: c.description,
      type: c.type as "PUBLIC" | "PRIVATE" | "TEAM" | "GROUP",
      teamId: c.teamId,
      groupId: c.groupId ?? null,
      createdById: c.createdById,
      createdAt: c.createdAt.toISOString(),
      archivedAt: c.archivedAt?.toISOString() ?? null,
      isMember: !!membership,
      categoryId: membership?.categoryId ?? null,
      order: membership?.order ?? 0,
    }
  }

  const channelList = activeChannels.map(mapChannel).sort((a, b) => a.order - b.order)
  const archivedList = archivedChannels.map(mapChannel)

  const channelDetail = {
    id: channel.id,
    name: channel.name,
    icon: channel.icon,
    description: channel.description,
    type: channel.type as "PUBLIC" | "PRIVATE" | "TEAM" | "GROUP",
    teamId: channel.teamId,
    groupId: channel.groupId ?? null,
    createdById: channel.createdById,
    createdAt: channel.createdAt.toISOString(),
    archivedAt: channel.archivedAt?.toISOString() ?? null,
    isMember: channel.members.some((m) => m.userId === userId),
    categoryId: null as string | null,
    order: 0,
    members: channel.members.map((m) => ({
      userId: m.userId,
      joinedAt: m.joinedAt.toISOString(),
      user: m.user,
    })),
  }

  const categoryList = categories.map((cat) => ({
    id: cat.id,
    name: cat.name,
    order: cat.order,
    collapsed: cat.collapsed,
  }))

  return (
    <div className="-m-6 h-[calc(100vh-0px)] flex overflow-hidden">
      <ChatLayout
        channels={channelList}
        archivedChannels={archivedList}
        teams={teams}
        categories={categoryList}
        currentUser={{ id: session.user.id, role: session.user.role ?? "MEMBER" }}
        activeChannel={channelDetail}
        initialMessages={initialMessages}
      />
    </div>
  )
}
