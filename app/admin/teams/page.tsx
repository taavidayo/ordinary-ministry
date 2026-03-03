import { db } from "@/lib/db"
import TeamsManager from "@/components/admin/TeamsManager"

export default async function TeamsPage() {
  const teams = await db.team.findMany({
    include: { roles: true, members: { include: { user: true } } },
    orderBy: { name: "asc" },
  })
  const users = await db.user.findMany({
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  })
  return <TeamsManager teams={teams} allUsers={users} />
}
