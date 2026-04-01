import { db } from "@/lib/db"
import TeamsManager from "@/components/admin/TeamsManager"

export default async function TeamsPage() {
  const teams = await db.team.findMany({
    include: {
      members: { include: { user: { select: { id: true, name: true, email: true, avatar: true } } } },
      channels: { select: { id: true, name: true }, take: 1 },
    },
    orderBy: { name: "asc" },
  })
  const users = await db.user.findMany({
    select: { id: true, name: true, email: true, avatar: true },
    orderBy: { name: "asc" },
  })
  return (
    <TeamsManager
      teams={teams.map((t) => ({ ...t, archivedAt: t.archivedAt?.toISOString() ?? null }))}
      allUsers={users}
    />
  )
}
