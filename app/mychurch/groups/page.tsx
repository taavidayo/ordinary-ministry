import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import GroupsManager from "@/components/admin/GroupsManager"

export default async function GroupsPage() {
  const session = await auth()
  const sessionRole = (session?.user?.role as string) ?? "MEMBER"

  const [groups, categories, users] = await Promise.all([
    db.group.findMany({
      include: {
        category: true,
        members: {
          include: { user: { select: { id: true, name: true, email: true, avatar: true } } },
        },
        channels: { select: { id: true, name: true }, take: 1 },
      },
      orderBy: { name: "asc" },
    }),
    db.groupCategory.findMany({ orderBy: { name: "asc" } }),
    db.user.findMany({
      select: { id: true, name: true, email: true, avatar: true },
      orderBy: { name: "asc" },
    }),
  ])

  return (
    <GroupsManager
      groups={groups.map((g) => ({ ...g, archivedAt: g.archivedAt?.toISOString() ?? null }))}
      categories={categories}
      allUsers={users}
      sessionRole={sessionRole}
    />
  )
}
