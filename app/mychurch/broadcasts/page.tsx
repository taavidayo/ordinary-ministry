import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import BroadcastsDashboard from "@/components/admin/BroadcastsDashboard"

export default async function BroadcastsPage() {
  const session = await auth()
  if (!session) redirect("/login")
  if ((session.user.role as string) !== "ADMIN") redirect("/mychurch/groups")

  const [categories, broadcasts] = await Promise.all([
    db.groupCategory.findMany({ orderBy: { name: "asc" } }),
    db.groupBroadcast.findMany({
      include: {
        author: { select: { id: true, name: true, avatar: true } },
        category: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ])

  return (
    <BroadcastsDashboard
      categories={categories}
      initialBroadcasts={broadcasts.map((b) => ({
        ...b,
        createdAt: b.createdAt.toISOString(),
        updatedAt: b.updatedAt.toISOString(),
        archivedAt: b.archivedAt?.toISOString() ?? null,
      }))}
    />
  )
}
