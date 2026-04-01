import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"
import ChatLayout from "@/components/admin/chat/ChatLayout"

export default async function ChatPage() {
  const session = await auth()
  if (!session) redirect("/login")

  const userId = session.user.id

  const [activeChannels, archivedChannels, teams, categories] = await Promise.all([
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
      />
    </div>
  )
}
