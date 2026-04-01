import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import UsersManager from "@/components/admin/UsersManager"

export default async function UsersPage() {
  const session = await auth()
  const sessionRole = (session?.user?.role as string) ?? "MEMBER"

  const [users, memberCategories, ministries, lastService] = await Promise.all([
    db.user.findMany({
      select: {
        id: true, name: true, email: true, role: true, phone: true, createdAt: true,
        birthday: true, gender: true,
        memberCategory: { select: { id: true, name: true, color: true } },
        ministry: { select: { id: true, name: true, color: true } },
      },
      orderBy: { name: "asc" },
    }),
    db.memberCategory.findMany({ orderBy: { name: "asc" } }),
    db.ministry.findMany({ orderBy: { name: "asc" } }),
    db.service.findFirst({
      orderBy: { date: "desc" },
      where: { date: { lte: new Date() } },
      select: {
        title: true,
        date: true,
        teams: { select: { slots: { select: { userId: true } } } },
      },
    }),
  ])

  const lastServiceStats = lastService
    ? {
        title: lastService.title,
        date: lastService.date.toISOString(),
        headcount: new Set(lastService.teams.flatMap((t) => t.slots.map((s) => s.userId))).size,
      }
    : null

  // Serialize Date fields before passing to client components
  const serializedUsers = users.map((u) => ({
    ...u,
    createdAt: u.createdAt.toISOString(),
    birthday: u.birthday?.toISOString() ?? null,
  }))

  return (
    <UsersManager
      users={serializedUsers}
      memberCategories={memberCategories}
      ministries={ministries}
      sessionRole={sessionRole}
      lastServiceStats={lastServiceStats}
    />
  )
}
