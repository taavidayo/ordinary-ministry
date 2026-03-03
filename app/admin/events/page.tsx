import { db } from "@/lib/db"
import EventsManager from "@/components/admin/EventsManager"

export default async function AdminEventsPage() {
  const events = await db.event.findMany({ orderBy: { startDate: "asc" } })
  return <EventsManager events={events} />
}
