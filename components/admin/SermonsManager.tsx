"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "sonner"
import { Plus, Trash2, Youtube } from "lucide-react"
import SermonPlaylistsTab from "@/components/admin/SermonPlaylistsTab"

interface Sermon {
  id: string
  title: string
  speaker: string
  date: Date
  description: string | null
  videoUrl: string | null
  audioUrl: string | null
  slug: string
  youtubeVideoId: string | null
  playlistId: string | null
  playlist: { id: string; name: string } | null
}

interface SermonPlaylist {
  id: string
  name: string
  youtubePlaylistId: string
  defaultSpeaker: string
  autoSync: boolean
  lastSyncedAt: string | null
  createdAt: string
  _count: { sermons: number }
}

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")
}

function toDateInput(d: Date | string): string {
  return new Date(d).toISOString().slice(0, 10)
}

interface Props {
  sermons: Sermon[]
  playlists: SermonPlaylist[]
}

export default function SermonsManager({ sermons: init, playlists: initPlaylists }: Props) {
  const [activeTab, setActiveTab] = useState<"sermons" | "playlists">("sermons")
  const [sermons, setSermons] = useState(init)

  // ── Create dialog ─────────────────────────────────────────────────────────
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
      setForm({ title: "", speaker: "", date: "", description: "", videoUrl: "", audioUrl: "", slug: "" })
      toast.success("Sermon created")
    } else {
      const err = await res.json()
      toast.error(err.error || "Failed")
    }
  }

  // ── Edit dialog ───────────────────────────────────────────────────────────
  const [editTarget, setEditTarget] = useState<Sermon | null>(null)
  const [editForm, setEditForm] = useState({
    title: "", speaker: "", date: "", description: "", videoUrl: "", audioUrl: "", slug: "",
  })
  const [editSaving, setEditSaving] = useState(false)

  function openEdit(s: Sermon) {
    setEditTarget(s)
    setEditForm({
      title: s.title,
      speaker: s.speaker,
      date: toDateInput(s.date),
      description: s.description ?? "",
      videoUrl: s.videoUrl ?? "",
      audioUrl: s.audioUrl ?? "",
      slug: s.slug,
    })
  }

  async function saveEdit() {
    if (!editTarget) return
    setEditSaving(true)
    const res = await fetch(`/api/sermons/${editTarget.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    })
    setEditSaving(false)
    if (res.ok) {
      const updated = await res.json()
      setSermons(sermons.map((s) => (s.id === editTarget.id ? { ...s, ...updated } : s)))
      setEditTarget(null)
      toast.success("Sermon updated")
    } else {
      const err = await res.json()
      toast.error(err.error || "Failed to save")
    }
  }

  async function deleteSermon(id: string) {
    if (!confirm("Delete sermon?")) return
    await fetch(`/api/sermons/${id}`, { method: "DELETE" })
    setSermons(sermons.filter((s) => s.id !== id))
    toast.success("Sermon deleted")
  }

  async function refreshSermons() {
    const res = await fetch("/api/sermons")
    if (res.ok) {
      const updated = await res.json()
      setSermons(updated)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Sermons</h1>
        {activeTab === "sermons" && (
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
        )}
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b">
        {(["sermons", "playlists"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors capitalize ${
              activeTab === tab
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Sermons tab */}
      {activeTab === "sermons" && (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Speaker</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Links</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {sermons.map((s) => (
                  <TableRow
                    key={s.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => openEdit(s)}
                  >
                    <TableCell className="font-medium">{s.title}</TableCell>
                    <TableCell>{s.speaker}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(s.date).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {s.playlist ? (
                        <Badge variant="secondary" className="text-xs gap-1">
                          <Youtube className="h-3 w-3 text-red-500" />
                          {s.playlist.name}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">Manual</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm space-x-2">
                      {s.videoUrl && <a href={s.videoUrl} target="_blank" rel="noopener" className="text-blue-600 hover:underline" onClick={(e) => e.stopPropagation()}>Video</a>}
                      {s.audioUrl && <a href={s.audioUrl} target="_blank" rel="noopener" className="text-blue-600 hover:underline" onClick={(e) => e.stopPropagation()}>Audio</a>}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive"
                        onClick={(e) => { e.stopPropagation(); deleteSermon(s.id) }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {sermons.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">No sermons yet.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Playlists tab */}
      {activeTab === "playlists" && (
        <SermonPlaylistsTab
          initialPlaylists={initPlaylists}
          onSermonsChanged={refreshSermons}
        />
      )}

      {/* ── Edit Sermon dialog ─────────────────────────────────────────────── */}
      <Dialog open={!!editTarget} onOpenChange={(o) => { if (!o) setEditTarget(null) }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Edit Sermon</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-2">
            <div className="space-y-1">
              <Label>Title</Label>
              <Input value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Speaker</Label>
              <Input value={editForm.speaker} onChange={(e) => setEditForm({ ...editForm, speaker: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Slug</Label>
              <Input value={editForm.slug} onChange={(e) => setEditForm({ ...editForm, slug: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Date</Label>
              <Input type="date" value={editForm.date} onChange={(e) => setEditForm({ ...editForm, date: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Description</Label>
              <Textarea rows={3} value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label>Video URL</Label>
                <Input value={editForm.videoUrl} onChange={(e) => setEditForm({ ...editForm, videoUrl: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Audio URL</Label>
                <Input value={editForm.audioUrl} onChange={(e) => setEditForm({ ...editForm, audioUrl: e.target.value })} />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" size="sm" onClick={() => setEditTarget(null)}>Cancel</Button>
              <Button size="sm" onClick={saveEdit} disabled={editSaving || !editForm.title.trim()}>
                {editSaving ? "Saving…" : "Save"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
