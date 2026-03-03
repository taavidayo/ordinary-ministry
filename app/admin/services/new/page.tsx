import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import NewServiceForm from "@/components/admin/NewServiceForm"

export default async function NewServicePage() {
  const session = await auth()
  const userRole = (session?.user?.role as string) ?? "MEMBER"

  const accessibleMinRoles =
    userRole === "ADMIN" ? ["ADMIN", "LEADER", "MEMBER"] :
    userRole === "LEADER" ? ["LEADER", "MEMBER"] :
    ["MEMBER"]

  const [categories, templates, allSeries] = await Promise.all([
    db.serviceCategory.findMany({
      where: { minRole: { in: accessibleMinRoles as ("ADMIN" | "LEADER" | "MEMBER")[] } },
      orderBy: [{ order: "asc" }, { name: "asc" }],
      select: { id: true, name: true, color: true },
    }),
    db.serviceTemplate.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    db.serviceSeries.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ])

  return <NewServiceForm categories={categories} templates={templates} allSeries={allSeries} />
}
