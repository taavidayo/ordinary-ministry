"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "sonner"
import { Plus, Trash2 } from "lucide-react"

interface Sermon {
  id: string
  title: string
  speaker: string
  date: Date
  description: string | null
  videoUrl: string | null
  audioUrl: string | null
  slug: string
}

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")
}

export default function SermonsManager({ sermons: init }: { sermons: Sermon[] }) {
  const [sermons, setSermons] = useState(init)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    title: "", speaker: "", date: "", description: "", videoUrl: "", audioUrl: "", slug: "",
  })

  function updateTitle(v: string) {
    setForm({ ...form, title: v, slug: slugify(v) })
  }

  async function createSermon() {
    setSaving(true)
    const res = await fetch("/api/sermons", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
    setSaving(false)
    if (res.ok) {
      const sermon = await res.json()
      setSermons([sermon, ...sermons])
      setOpen(false)
      toast.success("Sermon created")
    } else {
      const err = await res.json()
      toast.error(err.error || "Failed")
    }
  }

  async function deleteSermon(id: string) {
    if (!confirm("Delete sermon?")) return
    await fetch(`/api/sermons/${id}`, { method: "DELETE" })
    setSermons(sermons.filter((s) => s.id !== id))
    toast.success("Sermon deleted")
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Sermons</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-1" /> New Sermon</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Add Sermon</DialogTitle></DialogHeader>
            <div className="space-y-3 pt-2">
              {[
                { label: "Title *", key: "title", onChange: (v: string) => updateTitle(v) },
                { label: "Speaker *", key: "speaker" },
                { label: "Slug *", key: "slug" },
              ].map(({ label, key, onChange }) => (
                <div key={key} className="space-y-1">
                  <Label>{label}</Label>
                  <Input
                    value={form[key as keyof typeof form]}
                    onChange={(e) => onChange ? onChange(e.target.value) : setForm({ ...form, [key]: e.target.value })}
                  />
                </div>
              ))}
              <div className="space-y-1">
                <Label>Date *</Label>
                <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Description</Label>
                <Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label>Video URL</Label>
                  <Input value={form.videoUrl} onChange={(e) => setForm({ ...form, videoUrl: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>Audio URL</Label>
                  <Input value={form.audioUrl} onChange={(e) => setForm({ ...form, audioUrl: e.target.value })} />
                </div>
              </div>
              <Button onClick={createSermon} disabled={saving} className="w-full">
                {saving ? "Saving…" : "Create Sermon"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Speaker</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Links</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {sermons.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.title}</TableCell>
                  <TableCell>{s.speaker}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(s.date).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-sm space-x-2">
                    {s.videoUrl && <a href={s.videoUrl} target="_blank" rel="noopener" className="text-blue-600 hover:underline">Video</a>}
                    {s.audioUrl && <a href={s.audioUrl} target="_blank" rel="noopener" className="text-blue-600 hover:underline">Audio</a>}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteSermon(s.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {sermons.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">No sermons yet.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
