import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import GivingDashboard from "@/components/admin/GivingDashboard"

export default async function GivingPage() {
  const session = await auth()
  if (!session) redirect("/login")

  const userId = session.user.id as string
  const role = session.user.role as string
  const isAdmin = role === "ADMIN"

  // Access check: ADMIN or designated users
  if (!isAdmin) {
    const user = await db.user.findUnique({ where: { id: userId }, select: { canViewGiving: true } })
    if (!user?.canViewGiving) redirect("/mychurch/dashboard")
  }

  const [offerings, categories] = await Promise.all([
    db.offering.findMany({
      include: { category: { select: { id: true, name: true, color: true } } },
      orderBy: { createdAt: "desc" },
    }),
    db.offeringCategory.findMany({ orderBy: { name: "asc" }, where: {} }),
  ])

  const serialized = offerings.map(o => ({
    ...o,
    createdAt: o.createdAt.toISOString(),
  }))

  const serializedCategories = categories.map(c => ({
    ...c,
    archivedAt: c.archivedAt ? c.archivedAt.toISOString() : null,
  }))

  return (
    <GivingDashboard
      offerings={serialized}
      categories={serializedCategories}
      isAdmin={isAdmin}
    />
  )
}
