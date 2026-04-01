"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { toast } from "sonner"
import { Plus, Trash2, Save, ChevronDown, ChevronUp, FileText } from "lucide-react"
import FormBuilder, { FormFieldDef } from "@/components/admin/FormBuilder"

interface TemplateField {
  id: string; type: string; label: string; description: string | null
  required: boolean; order: number; config: unknown
}
interface Template {
  id: string; name: string; description: string | null
  fields: TemplateField[]
  _count: { forms: number }
}

function dbFieldsToBuilderFields(fields: TemplateField[]): FormFieldDef[] {
  return fields.map((f) => ({
    id: f.id,
    type: f.type as FormFieldDef["type"],
    label: f.label,
    description: f.description ?? "",
    required: f.required,
    config: (f.config as Record<string, unknown>) ?? {},
  }))
}

function TemplateCard({ template, onDelete }: { template: Template; onDelete: () => void }) {
  const [expanded, setExpanded] = useState(false)
  const [name, setName] = useState(template.name)
  const [description, setDescription] = useState(template.description ?? "")
  const [fields, setFields] = useState<FormFieldDef[]>(dbFieldsToBuilderFields(template.fields))
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    const res = await fetch(`/api/form-templates/${template.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description: description || null, fields }),
    })
    setSaving(false)
    if (res.ok) toast.success("Template saved")
    else toast.error("Failed to save")
  }

  async function del() {
    if (!confirm("Delete this template?")) return
    const res = await fetch(`/api/form-templates/${template.id}`, { method: "DELETE" })
    if (res.ok) { toast.success("Template deleted"); onDelete() }
    else toast.error("Failed to delete")
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 space-y-1">
            <CardTitle className="text-base">{name}</CardTitle>
            {description && <p className="text-sm text-muted-foreground">{description}</p>}
            <Badge variant="secondary" className="text-xs">Used in {template._count.forms} form{template._count.forms !== 1 ? "s" : ""}</Badge>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button variant="ghost" size="sm" onClick={() => setExpanded(!expanded)}>
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              {expanded ? "Close" : "Edit"}
            </Button>
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="space-y-4 border-t pt-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Template name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Description</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
          </div>

          <FormBuilder initialFields={fields} onChange={setFields} />

          <div className="flex justify-between pt-2">
            <Button variant="destructive" size="sm" onClick={del}>
              <Trash2 className="h-4 w-4 mr-1" /> Delete Template
            </Button>
            <Button size="sm" onClick={save} disabled={saving}>
              <Save className="h-4 w-4 mr-1" />{saving ? "Saving…" : "Save Template"}
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  )
}

export default function FormTemplatesManager({ templates: init }: { templates: Template[] }) {
  const [templates, setTemplates] = useState(init)
  const [open, setOpen] = useState(false)
  const [newName, setNewName] = useState("")
  const [newDesc, setNewDesc] = useState("")
  const [creating, setCreating] = useState(false)

  async function create() {
    if (!newName.trim()) { toast.error("Name required"); return }
    setCreating(true)
    const res = await fetch("/api/form-templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName, description: newDesc || null }),
    })
    setCreating(false)
    if (res.ok) {
      const created = await res.json()
      setTemplates([created, ...templates])
      setNewName("")
      setNewDesc("")
      setOpen(false)
      toast.success("Template created")
    } else {
      toast.error("Failed to create")
    }
  }

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Form Templates</h1>
          <p className="text-sm text-muted-foreground">Reusable sign-up form layouts for events</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-1" /> New Template</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New Form Template</DialogTitle></DialogHeader>
            <div className="space-y-3 pt-2">
              <div className="space-y-1">
                <Label>Name *</Label>
                <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. General Sign-Up" />
              </div>
              <div className="space-y-1">
                <Label>Description</Label>
                <Textarea rows={2} value={newDesc} onChange={(e) => setNewDesc(e.target.value)} />
              </div>
              <Button onClick={create} disabled={creating} className="w-full">
                {creating ? "Creating…" : "Create Template"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {templates.length === 0 && (
        <div className="border-2 border-dashed rounded-lg p-10 text-center text-muted-foreground">
          <FileText className="h-8 w-8 mx-auto mb-2 opacity-40" />
          <p>No templates yet. Create one to reuse across events.</p>
        </div>
      )}

      {templates.map((t) => (
        <TemplateCard
          key={t.id}
          template={t}
          onDelete={() => setTemplates(templates.filter((x) => x.id !== t.id))}
        />
      ))}
    </div>
  )
}
