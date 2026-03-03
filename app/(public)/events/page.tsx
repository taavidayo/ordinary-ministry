export const dynamic = "force-dynamic"

import { db } from "@/lib/db"

export default async function EventsPage() {
  const events = await db.event.findMany({ orderBy: { startDate: "asc" } })

  return (
    <div className="max-w-3xl mx-auto px-4 py-16">
      <h1 className="text-3xl font-bold mb-8">Events</h1>
      {events.length === 0 && <p className="text-muted-foreground">No upcoming events.</p>}
      <div className="space-y-4">
        {events.map((ev) => (
          <div key={ev.id} className="border rounded-lg p-5">
            <h2 className="text-xl font-semibold mb-1">{ev.title}</h2>
            <p className="text-sm text-muted-foreground mb-2">
              {new Date(ev.startDate).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
              {ev.endDate && ` – ${new Date(ev.endDate).toLocaleDateString()}`}
              {ev.location && ` · ${ev.location}`}
            </p>
            {ev.description && <p className="text-sm">{ev.description}</p>}
          </div>
        ))}
      </div>
    </div>
  )
}
