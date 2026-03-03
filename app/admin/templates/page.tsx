import { db } from "@/lib/db"
import TemplatesManager from "@/components/admin/TemplatesManager"

export default async function TemplatesPage() {
  const templates = await db.serviceTemplate.findMany({
    orderBy: { name: "asc" },
    include: {
      times: { orderBy: { order: "asc" }, include: { items: true } },
      templateTeams: true,
    },
  })

  return <TemplatesManager templates={templates} />
}
