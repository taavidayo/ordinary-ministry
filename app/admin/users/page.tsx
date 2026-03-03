import { db } from "@/lib/db"
import UsersManager from "@/components/admin/UsersManager"

export default async function UsersPage() {
  const users = await db.user.findMany({
    select: { id: true, name: true, email: true, role: true, phone: true, createdAt: true },
    orderBy: { name: "asc" },
  })
  return <UsersManager users={users} />
}
