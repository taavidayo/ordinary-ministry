export const dynamic = "force-dynamic"

import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import { parseSections } from "@/lib/page-blocks"
import PublicPageRenderer from "@/components/public/PublicPageRenderer"
import PublicEventsClient from "@/components/public/PublicEventsClient"

export default async function EventsPage() {
  // Try CMS-managed content first
  const cmsPage = await db.page.findUnique({ where: { slug: "events" } })
  if (cmsPage?.published) {
    const sections = parseSections(cmsPage.content)
    if (sections.some(s => s.blocks.length > 0)) {
      return <PublicPageRenderer sections={sections} />
    }
  }

  // Fallback: default events listing
  const session = await auth()
  const userId = session?.user?.id as string | undefined

  const events = await db.event.findMany({
    where: { published: true, startDate: { gte: new Date() } },
    orderBy: { startDate: "asc" },
    select: {
      id: true,
      title: true,
      description: true,
      startDate: true,
      endDate: true,
      location: true,
      rsvpEnabled: true,
      form: { select: { id: true } },
    },
  })

  // Get the user's existing RSVPs for these events
  const myRsvpEventIds: string[] = []
  if (userId) {
    const rsvps = await db.eventRsvp.findMany({
      where: { eventId: { in: events.map(e => e.id) }, userId },
      select: { eventId: true },
    })
    myRsvpEventIds.push(...rsvps.map(r => r.eventId))
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-16">
      <h1 className="text-3xl font-bold mb-8">Upcoming Events</h1>
      <PublicEventsClient events={events} currentUserId={userId} myRsvpEventIds={myRsvpEventIds} />
    </div>
  )
}
