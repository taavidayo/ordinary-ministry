import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import Dashboard from "@/components/admin/dashboard/Dashboard"

export default async function DashboardPage() {
  const session = await auth()
  const userId = session?.user?.id as string
  const userRole = (session?.user?.role as string) ?? "MEMBER"
  const isAdmin = userRole === "ADMIN"
  const now = new Date()

  const [
    serviceRequests,
    upcomingServices,
    announcements,
    tasks,
    events,
    widgetRows,
    userProfile,
    ministrySetting,
  ] = await Promise.all([
    db.serviceSlot.findMany({
      where: {
        userId,
        status: "PENDING",
        serviceTeam: { service: { date: { gte: now } } },
      },
      include: {
        role: true,
        serviceTeam: {
          include: {
            team: true,
            service: { select: { id: true, title: true, date: true } },
          },
        },
      },
    }),

    db.serviceSlot.findMany({
      where: {
        userId,
        status: { not: "DECLINED" },
        serviceTeam: { service: { date: { gte: now } } },
      },
      include: {
        role: true,
        serviceTeam: {
          include: {
            team: true,
            service: { select: { id: true, title: true, date: true } },
          },
        },
      },
    }),

    db.announcement.findMany({
      orderBy: { createdAt: "desc" },
      include: { author: { select: { id: true, name: true } } },
    }),

    db.task.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
    }),

    db.event.findMany({
      where: { startDate: { gte: now } },
      orderBy: { startDate: "asc" },
      take: 10,
    }),

    db.dashboardWidget.findMany({ where: { userId } }),

    db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        birthday: true,
        avatar: true,
        createdAt: true,
        teamMemberships: { include: { team: { select: { name: true } } } },
      },
    }),

    db.ministrySetting.upsert({
      where: { id: "default" },
      create: { id: "default", name: "Ordinary Ministry" },
      update: {},
    }),
  ])

  const sortByDate = <T extends { serviceTeam: { service: { date: Date } } }>(arr: T[]) =>
    [...arr].sort((a, b) => a.serviceTeam.service.date.getTime() - b.serviceTeam.service.date.getTime())

  const sortedRequests = sortByDate(serviceRequests)
  const sortedUpcoming = sortByDate(upcomingServices).slice(0, 10)

  return (
    <Dashboard
      serviceRequests={sortedRequests.map((s) => ({
        id: s.id,
        status: s.status,
        role: { name: s.role.name },
        serviceTeam: {
          team: { name: s.serviceTeam.team.name },
          service: {
            id: s.serviceTeam.service.id,
            title: s.serviceTeam.service.title,
            date: s.serviceTeam.service.date.toISOString(),
          },
        },
      }))}
      upcomingServices={sortedUpcoming.map((s) => ({
        id: s.id,
        status: s.status,
        role: { name: s.role.name },
        serviceTeam: {
          team: { name: s.serviceTeam.team.name },
          service: {
            id: s.serviceTeam.service.id,
            title: s.serviceTeam.service.title,
            date: s.serviceTeam.service.date.toISOString(),
          },
        },
      }))}
      announcements={announcements.map((a) => ({
        id: a.id,
        title: a.title,
        body: a.body,
        createdAt: a.createdAt.toISOString(),
        author: { id: a.author.id, name: a.author.name },
      }))}
      tasks={tasks.map((t) => ({
        id: t.id,
        content: t.content,
        done: t.done,
        createdAt: t.createdAt.toISOString(),
      }))}
      events={events.map((e) => ({
        id: e.id,
        title: e.title,
        startDate: e.startDate.toISOString(),
        endDate: e.endDate?.toISOString() ?? null,
        location: e.location,
      }))}
      widgetRows={widgetRows.map((w) => ({
        widgetId: w.widgetId,
        visible: w.visible,
        order: w.order,
        width: w.width,
        gridX: w.gridX,
        gridY: w.gridY,
        gridW: w.gridW,
        gridH: w.gridH,
      }))}
      userProfile={userProfile ? {
        id: userProfile.id,
        name: userProfile.name,
        email: userProfile.email,
        role: userProfile.role as string,
        phone: userProfile.phone,
        birthday: userProfile.birthday?.toISOString() ?? null,
        avatar: userProfile.avatar,
        createdAt: userProfile.createdAt.toISOString(),
        teams: userProfile.teamMemberships.map((m) => m.team.name),
      } : null}
      isAdmin={isAdmin}
      timezone={ministrySetting.timezone}
    />
  )
}
