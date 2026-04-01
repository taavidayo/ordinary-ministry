import { db } from "@/lib/db"
import type { EventsBlock } from "@/lib/page-blocks"
import PublicEventsClient from "./PublicEventsClient"

export default async function EventsBlockContent({ block }: { block: EventsBlock }) {
  const take = block.maxCount > 0 ? block.maxCount : undefined
  const events = await db.event.findMany({
    where: { published: true, startDate: { gte: new Date() } },
    orderBy: { startDate: "asc" },
    take,
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

  const s = block.sectionBg ? { backgroundColor: block.sectionBg } : undefined
  return (
    <section style={s} className="py-8 px-6 h-full">
      {block.heading && <h2 className="text-2xl font-bold mb-6">{block.heading}</h2>}
      <PublicEventsClient events={events} />
    </section>
  )
}
