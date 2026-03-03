import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { CalendarDays, Music, Settings2, LayoutTemplate } from "lucide-react"
import CollapsibleServiceGroups from "@/components/admin/CollapsibleServiceGroups"
import AvailabilitySheet from "@/components/admin/AvailabilitySheet"
import NewServiceDialog from "@/components/admin/NewServiceDialog"

export default async function ServicesPage() {
  const session = await auth()
  const userRole = (session?.user?.role as string) ?? "MEMBER"
  const isAdmin = userRole === "ADMIN"

  const accessibleMinRoles =
    userRole === "ADMIN" ? ["ADMIN", "LEADER", "MEMBER"] :
    userRole === "LEADER" ? ["LEADER", "MEMBER"] :
    ["MEMBER"]

  const [services, categories, templates, allSeries] = await Promise.all([
    db.service.findMany({
      orderBy: { date: "asc" },
      where: {
        OR: [
          { categoryId: null },
          { category: { minRole: { in: accessibleMinRoles as ("ADMIN" | "LEADER" | "MEMBER")[] } } },
        ],
      },
      include: {
        _count: { select: { times: true } },
        category: true,
        series: { select: { id: true, name: true } },
        updatedBy: { select: { id: true, name: true } },
      },
    }),
    db.serviceCategory.findMany({
      where: { minRole: { in: accessibleMinRoles as ("ADMIN" | "LEADER" | "MEMBER")[] } },
      orderBy: [{ order: "asc" }, { name: "asc" }],
      select: { id: true, name: true, color: true },
    }),
    db.serviceTemplate.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.serviceSeries.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ])

  // Group by category name, uncategorized last
  const grouped: Record<string, typeof services> = {}
  for (const s of services) {
    const key = s.category?.name ?? "Uncategorized"
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(s)
  }

  const groupKeys = Object.keys(grouped).sort((a, b) =>
    a === "Uncategorized" ? 1 : b === "Uncategorized" ? -1 : a.localeCompare(b)
  )

  const categoryMeta: Record<string, { color: string; minRole: string }> = {}
  for (const s of services) {
    if (s.category) {
      categoryMeta[s.category.name] = { color: s.category.color, minRole: s.category.minRole }
    }
  }

  const groups = groupKeys.map((key) => ({
    key,
    meta: categoryMeta[key],
    services: grouped[key].map((s) => ({
      id: s.id,
      title: s.title,
      date: s.date.toISOString(),
      timesCount: s._count.times,
      series: s.series ? { id: s.series.id, name: s.series.name } : null,
      updatedAt: s.updatedAt.toISOString(),
      updatedBy: s.updatedBy ? { name: s.updatedBy.name } : null,
      category: s.category
        ? { name: s.category.name, color: s.category.color, minRole: s.category.minRole }
        : null,
    })),
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Services</h1>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <Button variant="outline" asChild>
              <Link href="/admin/service-categories">
                <Settings2 className="h-4 w-4 mr-1" /> Manage Categories
              </Link>
            </Button>
          )}
          <AvailabilitySheet userId={session?.user?.id as string} />
          <Button variant="outline" asChild>
            <Link href="/admin/services/templates">
              <LayoutTemplate className="h-4 w-4 mr-1" /> Templates
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/admin/songs">
              <Music className="h-4 w-4 mr-1" /> Song Library
            </Link>
          </Button>
          <NewServiceDialog categories={categories} templates={templates} allSeries={allSeries} />
        </div>
      </div>

      {services.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <CalendarDays className="h-10 w-10 mx-auto mb-2 opacity-30" />
          <p>No services yet.</p>
        </div>
      ) : (
        <CollapsibleServiceGroups groups={groups} isAdmin={isAdmin} />
      )}
    </div>
  )
}
