import { db } from "@/lib/db"
import { notFound } from "next/navigation"
import TemplateEditor from "@/components/admin/TemplateEditor"

export default async function TemplateEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const [template, allTeams] = await Promise.all([
    db.serviceTemplate.findUnique({
      where: { id },
      include: {
        times: { orderBy: { order: "asc" }, include: { items: { orderBy: { order: "asc" } } } },
        templateTeams: { include: { team: true } },
      },
    }),
    db.team.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ])

  if (!template) notFound()

  return (
    <TemplateEditor
      template={template as Parameters<typeof TemplateEditor>[0]["template"]}
      allTeams={allTeams}
    />
  )
}
