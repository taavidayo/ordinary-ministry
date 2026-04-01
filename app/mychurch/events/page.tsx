import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import EventsManager from "@/components/admin/EventsManager"

export default async function AdminEventsPage() {
  const session = await auth()
  const userRole = (session?.user?.role as string) ?? "MEMBER"

  const [events, templates] = await Promise.all([
    db.event.findMany({
      orderBy: { startDate: "asc" },
      include: { form: { select: { _count: { select: { responses: true } } } } },
    }),
    db.formTemplate.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ])
  return <EventsManager events={events} templates={templates} userRole={userRole} />
}
