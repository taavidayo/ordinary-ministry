export const dynamic = "force-dynamic"

import { db } from "@/lib/db"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default async function HomePage() {
  const [latestSermon, upcomingEvents] = await Promise.all([
    db.sermon.findFirst({ orderBy: { date: "desc" } }),
    db.event.findMany({ where: { startDate: { gte: new Date() } }, orderBy: { startDate: "asc" }, take: 3 }),
  ])

  return (
    <div>
      {/* Hero */}
      <section className="bg-gray-900 text-white py-32 px-4 text-center">
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-4">Ordinary Ministry</h1>
        <p className="text-lg md:text-xl text-gray-300 max-w-xl mx-auto mb-8">
          A community gathered around ordinary means of grace — Word, water, bread, and wine.
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Button size="lg" asChild>
            <Link href="/about">Who We Are</Link>
          </Button>
          <Button size="lg" variant="outline" className="text-white border-white hover:bg-white hover:text-gray-900" asChild>
            <Link href="/get-involved">Get Involved</Link>
          </Button>
        </div>
      </section>

      {/* Service times */}
      <section className="py-16 px-4 bg-white text-center">
        <h2 className="text-2xl font-bold mb-2">Join Us Sundays</h2>
        <p className="text-muted-foreground">10:00 AM — 123 Church St, Your City</p>
      </section>

      {/* Latest sermon */}
      {latestSermon && (
        <section className="py-16 px-4 bg-gray-50">
          <div className="max-w-3xl mx-auto">
            <p className="text-sm uppercase tracking-wide text-muted-foreground mb-2">Latest Sermon</p>
            <h2 className="text-2xl font-bold mb-1">{latestSermon.title}</h2>
            <p className="text-muted-foreground mb-4">{latestSermon.speaker} · {new Date(latestSermon.date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p>
            {latestSermon.description && <p className="mb-4 text-muted-foreground">{latestSermon.description}</p>}
            <Button asChild variant="outline">
              <Link href="/sermons">View All Sermons</Link>
            </Button>
          </div>
        </section>
      )}

      {/* Upcoming events */}
      {upcomingEvents.length > 0 && (
        <section className="py-16 px-4 bg-white">
          <div className="max-w-3xl mx-auto">
            <p className="text-sm uppercase tracking-wide text-muted-foreground mb-2">Upcoming</p>
            <h2 className="text-2xl font-bold mb-6">Events</h2>
            <div className="space-y-4">
              {upcomingEvents.map((ev) => (
                <div key={ev.id} className="border rounded-lg p-4">
                  <p className="font-semibold">{ev.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(ev.startDate).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
                    {ev.location && ` · ${ev.location}`}
                  </p>
                  {ev.description && <p className="text-sm mt-1">{ev.description}</p>}
                </div>
              ))}
            </div>
            <Button asChild variant="outline" className="mt-6">
              <Link href="/events">All Events</Link>
            </Button>
          </div>
        </section>
      )}

      {/* Give CTA */}
      <section className="py-16 px-4 bg-gray-900 text-white text-center">
        <h2 className="text-2xl font-bold mb-2">Support Our Ministry</h2>
        <p className="text-gray-300 mb-6">Your generosity makes this community possible.</p>
        <Button asChild size="lg">
          <Link href="/give">Give Online</Link>
        </Button>
      </section>
    </div>
  )
}
