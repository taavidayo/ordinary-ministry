import { notFound } from "next/navigation"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import GroupDashboard from "@/components/admin/GroupDashboard"

export default async function GroupDashboardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  const currentUserId = session?.user?.id ?? ""
  const sessionRole = (session?.user?.role as string) ?? "MEMBER"

  const [group, categories, allUsers, allChannels] = await Promise.all([
    db.group.findUnique({
      where: { id },
      include: {
        category: true,
        channels: { select: { id: true, name: true } },
        members: {
          include: { user: { select: { id: true, name: true, email: true, avatar: true } } },
          orderBy: [{ role: "asc" }, { joinedAt: "asc" }],
        },
        events: {
          include: {
            attendance: { include: { user: { select: { id: true, name: true, avatar: true } } } },
          },
          orderBy: { startDate: "asc" },
        },
      },
    }),
    db.groupCategory.findMany({ orderBy: { name: "asc" } }),
    db.user.findMany({
      select: { id: true, name: true, email: true, avatar: true },
      orderBy: { name: "asc" },
    }),
    db.channel.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ])

  if (!group) notFound()

  const broadcasts = await db.groupBroadcast.findMany({
    where: group.categoryId
      ? { OR: [{ categoryId: group.categoryId }, { categoryId: null }] }
      : { categoryId: null },
    include: { author: { select: { id: true, name: true, avatar: true } } },
    orderBy: { createdAt: "desc" },
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (
    <GroupDashboard
      group={{ ...group, archivedAt: group.archivedAt?.toISOString() ?? null } as any}
      categories={categories}
      allUsers={allUsers}
      allChannels={allChannels}
      currentUserId={currentUserId}
      sessionRole={sessionRole}
      broadcasts={broadcasts.map(b => ({ ...b, createdAt: b.createdAt.toISOString(), updatedAt: b.updatedAt.toISOString() }))}
    />
  )
}
