import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"

const DEFAULT_WIDGETS = [
  { widgetId: "service-requests", visible: true, order: 0, width: 1 },
  { widgetId: "upcoming-services", visible: true, order: 1, width: 1 },
  { widgetId: "announcements",     visible: true, order: 2, width: 1 },
  { widgetId: "tasks",             visible: true, order: 3, width: 1 },
  { widgetId: "events",            visible: true, order: 4, width: 1 },
]

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const userId = session.user?.id as string
  const rows = await db.dashboardWidget.findMany({ where: { userId } })

  if (rows.length === 0) return NextResponse.json(DEFAULT_WIDGETS)
  return NextResponse.json(rows.map((r) => ({ widgetId: r.widgetId, visible: r.visible, order: r.order, width: r.width })))
}

export async function PUT(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const userId = session.user?.id as string
  const { widgets } = await req.json() as { widgets: { widgetId: string; visible: boolean; order: number; width: number }[] }

  await Promise.all(
    widgets.map((w) =>
      db.dashboardWidget.upsert({
        where: { userId_widgetId: { userId, widgetId: w.widgetId } },
        create: { userId, widgetId: w.widgetId, visible: w.visible, order: w.order, width: w.width },
        update: { visible: w.visible, order: w.order, width: w.width },
      })
    )
  )

  return NextResponse.json({ ok: true })
}
