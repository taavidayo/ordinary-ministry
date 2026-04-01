import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import { notFound } from "next/navigation"
import EventDetail from "@/components/admin/EventDetail"

export default async function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  const userRole = (session?.user?.role as string) ?? "MEMBER"

  const event = await db.event.findUnique({
    where: { id },
    include: {
      form: {
        include: {
          fields: { orderBy: { order: "asc" } },
          _count: { select: { responses: true } },
        },
      },
      sourceService: {
        select: { id: true, title: true, date: true, category: { select: { name: true } } },
      },
    },
  })
  if (!event) notFound()

  const templates = await db.formTemplate.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } })

  return <EventDetail event={event} templates={templates} userRole={userRole} />
}
