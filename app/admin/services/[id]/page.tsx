import { db } from "@/lib/db"
import { notFound } from "next/navigation"
import ServicePlanner, { type ServicePlannerService } from "@/components/admin/ServicePlanner"

export default async function ServicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const [service, allSongs, allTeams, allSeries, allServiceIds, allTemplates] = await Promise.all([
    db.service.findUnique({
      where: { id },
      include: {
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
        series: true,
      },
    }),
    db.song.findMany({
      include: { arrangements: true },
      orderBy: { title: "asc" },
    }),
    db.team.findMany({
      include: {
        roles: true,
        members: { include: { user: true } },
      },
      orderBy: { name: "asc" },
    }),
    db.serviceSeries.findMany({ orderBy: { name: "asc" } }),
    db.service.findMany({
      orderBy: [{ date: "asc" }, { createdAt: "asc" }],
      select: { id: true },
    }),
    db.serviceTemplate.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, description: true },
    }),
  ])

  if (!service) notFound()

  const currentIndex = allServiceIds.findIndex((s) => s.id === id)
  const prevId = currentIndex > 0 ? allServiceIds[currentIndex - 1].id : null
  const nextId = currentIndex < allServiceIds.length - 1 ? allServiceIds[currentIndex + 1].id : null

  return (
    <ServicePlanner
      service={service as unknown as ServicePlannerService}
      allSongs={allSongs}
      allTeams={allTeams}
      allSeries={allSeries}
      allTemplates={allTemplates}
      prevId={prevId}
      nextId={nextId}
    />
  )
}
