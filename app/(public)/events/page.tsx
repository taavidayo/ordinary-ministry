export const dynamic = "force-dynamic"

import { db } from "@/lib/db"
import { EventsCalendar } from "@/components/public/EventsCalendar"

export default async function EventsPage() {
  const events = await db.event.findMany({
    where: { published: true },
    orderBy: { startDate: "asc" },
  })

  const serialized = events.map((ev) => ({
    id: ev.id,
    title: ev.title,
    startDate: ev.startDate.toISOString(),
    endDate: ev.endDate?.toISOString() ?? null,
    location: ev.location,
    description: ev.description,
  }))

  return (
    <div className="max-w-5xl mx-auto px-4 py-16">
      <h1 className="text-3xl font-bold mb-8">Events</h1>
      <EventsCalendar events={serialized} />
    </div>
  )
}
