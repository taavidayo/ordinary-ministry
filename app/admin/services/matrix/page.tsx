import { redirect } from "next/navigation"
import Link from "next/link"
import { db } from "@/lib/db"
import { ChevronLeft } from "lucide-react"
import ServiceMatrix from "@/components/admin/ServiceMatrix"

interface Props {
  searchParams: Promise<{ categoryId?: string }>
}

export default async function ServiceMatrixPage({ searchParams }: Props) {
  const { categoryId } = await searchParams

  if (!categoryId) redirect("/admin/services")

  const [category, services, allTeams, allSeries, allTemplates] = await Promise.all([
    db.serviceCategory.findUnique({
      where: { id: categoryId },
      select: { id: true, name: true, color: true, minRole: true },
    }),
    db.service.findMany({
      where: { categoryId },
      orderBy: { date: "asc" },
      include: {
        series: true,
        times: {
          orderBy: { order: "asc" },
          include: {
            items: {
              include: { song: true, arrangement: true },
              orderBy: { order: "asc" },
            },
          },
        },
        teams: {
          include: {
            team: true,
            slots: { include: { role: true, user: true } },
          },
        },
        scheduleEntries: { orderBy: { order: "asc" } },
      },
    }),
    db.team.findMany({
      include: {
        roles: true,
        members: { include: { user: true } },
      },
      orderBy: { name: "asc" },
    }),
    db.serviceSeries.findMany({ orderBy: { name: "asc" } }),
    db.serviceTemplate.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, description: true },
    }),
  ])

  if (!category) redirect("/admin/services")

  // Serialize dates to ISO strings for client component
  const serializedServices = services.map((s) => ({
    ...s,
    date: s.date.toISOString(),
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
    series: s.series
      ? { id: s.series.id, name: s.series.name, imageUrl: s.series.imageUrl }
      : null,
  }))

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link
          href="/admin/services"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          Services
        </Link>
        <span className="text-muted-foreground">/</span>
        <h1 className="text-xl font-bold">{category.name} — Matrix</h1>
        <span className="text-sm text-muted-foreground">({services.length} service{services.length !== 1 ? "s" : ""})</span>
      </div>

      <ServiceMatrix
        category={category}
        services={serializedServices}
        allTeams={allTeams}
        allSeries={allSeries}
        allTemplates={allTemplates}
      />
    </div>
  )
}
