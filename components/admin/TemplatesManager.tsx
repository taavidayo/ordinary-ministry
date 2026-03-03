"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { Plus, Trash2, Pencil, Clock, Users } from "lucide-react"

interface TemplateItem { id: string }
interface TemplateTime { id: string; label: string; items: TemplateItem[] }
interface TemplateTeam { id: string }
interface Template {
  id: string
  name: string
  description: string | null
  times: TemplateTime[]
  templateTeams: TemplateTeam[]
}

interface Props {
  templates: Template[]
}

export default function TemplatesManager({ templates: init }: Props) {
  const [templates, setTemplates] = useState(init)
  const [newName, setNewName] = useState("")

  async function createTemplate() {
    if (!newName.trim()) return
    const res = await fetch("/api/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim() }),
    })
    if (res.ok) {
      const t = await res.json()
      setTemplates([...templates, t])
      setNewName("")
      toast.success("Template created")
    } else {
      toast.error("Failed to create template")
    }
  }

  async function deleteTemplate(id: string) {
    if (!confirm("Delete this template? Services created from it won't be affected.")) return
    const res = await fetch(`/api/templates/${id}`, { method: "DELETE" })
    if (res.ok) {
      setTemplates(templates.filter((t) => t.id !== id))
      toast.success("Template deleted")
    }
  }

  const totalItems = (t: Template) => t.times.reduce((sum, time) => sum + time.items.length, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Templates</h1>
        <div className="flex gap-2">
          <Input
            placeholder="New template name…"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && createTemplate()}
            className="w-56"
          />
          <Button onClick={createTemplate}>
            <Plus className="h-4 w-4 mr-1" />Create
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {templates.map((t) => (
          <Card key={t.id} className="flex flex-col">
            <CardHeader className="flex flex-row items-start justify-between py-3 gap-2">
              <div className="min-w-0">
                <CardTitle className="text-base truncate">{t.name}</CardTitle>
                {t.description && (
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{t.description}</p>
                )}
              </div>
              <div className="flex gap-1 shrink-0">
                <Link href={`/admin/services/templates/${t.id}`}>
                  <Button variant="outline" size="icon" className="h-8 w-8">
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                </Link>
                <Button
                  variant="destructive"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => deleteTemplate(t.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="flex gap-4 text-sm text-muted-foreground pt-0">
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {t.times.length} time{t.times.length !== 1 ? "s" : ""}
              </span>
              <span className="flex items-center gap-1">
                <Plus className="h-3.5 w-3.5" />
                {totalItems(t)} item{totalItems(t) !== 1 ? "s" : ""}
              </span>
              <span className="flex items-center gap-1">
                <Users className="h-3.5 w-3.5" />
                {t.templateTeams.length} team{t.templateTeams.length !== 1 ? "s" : ""}
              </span>
            </CardContent>
          </Card>
        ))}
        {templates.length === 0 && (
          <p className="col-span-full text-center text-muted-foreground py-12">
            No templates yet. Create one above.
          </p>
        )}
      </div>
    </div>
  )
}
