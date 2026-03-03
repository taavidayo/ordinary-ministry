import { db } from "@/lib/db"
import AdminSermonsManager from "@/components/admin/SermonsManager"

export default async function AdminSermonsPage() {
  const sermons = await db.sermon.findMany({ orderBy: { date: "desc" } })
  return <AdminSermonsManager sermons={sermons} />
}
