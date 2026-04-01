import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Settings2, LayoutTemplate } from "lucide-react"
import NewServiceDialog from "@/components/admin/NewServiceDialog"
import ServicesLayout from "@/components/admin/ServicesLayout"

export default async function ServicesPage() {
  const session = await auth()
  const userRole = (session?.user?.role as string) ?? "MEMBER"
  const isAdmin = userRole === "ADMIN"

  const accessibleMinRoles =
    userRole === "ADMIN" ? ["ADMIN", "LEADER", "MEMBER"] :
    userRole === "LEADER" ? ["LEADER", "MEMBER"] :
    ["MEMBER"]

  const userId = session?.user?.id as string
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [services, categories, templates, allSeries, mySlots] = await Promise.all([
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
      select: { id: true, name: true, color: true, minRole: true },
    }),
    db.serviceTemplate.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.serviceSeries.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.serviceSlot.findMany({
      where: {
        userId,
        status: { not: "DECLINED" },
        serviceTeam: { service: { date: { gte: today } } },
      },
      include: {
        role: { select: { id: true, name: true } },
        serviceTeam: {
          include: {
            service: { select: { id: true, title: true, date: true } },
            serviceTime: { select: { label: true, startTime: true } },
          },
        },
      },
      orderBy: { serviceTeam: { service: { date: "asc" } } },
      take: 10,
    }),
  ])

  const allServiceRows = services.map((s) => ({
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
  }))

  const categoryMeta: Record<string, { id: string; color: string; minRole: string }> = {}
  for (const cat of categories) {
    categoryMeta[cat.name] = { id: cat.id, color: cat.color, minRole: cat.minRole }
  }

  return (
    <div className="space-y-4">
      {/* Desktop header — hidden on mobile (mobile uses bottom tab bar) */}
      <div className="hidden md:flex items-center justify-between">
        <h1 className="text-2xl font-bold">Services</h1>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" title="Settings">
                <Settings2 className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {isAdmin && (
                <DropdownMenuItem asChild>
                  <Link href="/mychurch/service-categories" className="flex items-center gap-2">
                    <Settings2 className="h-3.5 w-3.5" /> Manage Categories
                  </Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuItem asChild>
                <Link href="/mychurch/services/templates" className="flex items-center gap-2">
                  <LayoutTemplate className="h-3.5 w-3.5" /> Templates
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <NewServiceDialog categories={categories} templates={templates} allSeries={allSeries} />
        </div>
      </div>

      <ServicesLayout
        allServices={allServiceRows}
        categoryMeta={categoryMeta}
        isAdmin={isAdmin}
        todayIso={today.toISOString()}
        userId={userId}
        mySlots={mySlots.map(s => ({
          id: s.id,
          status: s.status,
          roleName: s.role.name,
          serviceId: s.serviceTeam.service.id,
          serviceTitle: s.serviceTeam.service.title,
          serviceDate: s.serviceTeam.service.date.toISOString(),
          serviceTimeLabel: s.serviceTeam.serviceTime?.label ?? null,
          serviceTimeStart: s.serviceTeam.serviceTime?.startTime ?? null,
        }))}
        categories={categories}
        templates={templates}
        allSeries={allSeries}
      />
    </div>
  )
}
