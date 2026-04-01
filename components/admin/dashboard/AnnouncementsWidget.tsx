"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Megaphone, Plus, X } from "lucide-react"
import { toast } from "sonner"

export interface AnnouncementItem {
  id: string
  title: string
  body: string
  createdAt: string
  expiresAt: string | null
  author: { id: string; name: string }
}

interface Props {
  announcements: AnnouncementItem[]
  canPost: boolean
  onNew?: (a: AnnouncementItem) => void
}

function defaultExpiryDate() {
  const d = new Date()
  d.setDate(d.getDate() + 7)
  return d.toISOString().slice(0, 10)
}

export default function AnnouncementsWidget({ announcements: initial, canPost, onNew }: Props) {
  const [items, setItems] = useState(initial)
  const [adding, setAdding] = useState(false)
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
  const [expiryDate, setExpiryDate] = useState(defaultExpiryDate)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  async function handleAdd() {
    if (!title.trim() || !body.trim()) return
    setSaving(true)
    const expiresAt = new Date(expiryDate).toISOString()
    const res = await fetch("/api/announcements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: title.trim(), body: body.trim(), expiresAt }),
    })
    setSaving(false)
    if (!res.ok) { toast.error("Failed to post"); return }
    const created: AnnouncementItem = await res.json()
    setItems((prev) => [created, ...prev])
    setTitle(""); setBody(""); setExpiryDate(defaultExpiryDate()); setAdding(false)
    toast.success("Announcement posted")
    onNew?.(created)
  }

  async function handleDelete(id: string) {
    setDeleting(id)
    const res = await fetch(`/api/announcements/${id}`, { method: "DELETE" })
    setDeleting(null)
    if (!res.ok) { toast.error("Failed to delete"); return }
    setItems((prev) => prev.filter((a) => a.id !== id))
  }

  function formatExpiry(expiresAt: string | null) {
    if (!expiresAt) return null
    const date = new Date(expiresAt)
    const now = new Date()
    const diffMs = date.getTime() - now.getTime()
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
    if (diffDays <= 0) return "Expires today"
    if (diffDays === 1) return "Expires tomorrow"
    return `Expires ${date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-5 py-3.5 border-b shrink-0">
        <Megaphone className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-semibold">Announcements</span>
        {canPost && (
          <button
            onClick={() => setAdding(true)}
            className="ml-auto text-muted-foreground hover:text-foreground transition-colors"
            title="New announcement"
          >
            <Plus className="h-4 w-4" />
          </button>
        )}
      </div>

      <Dialog open={adding} onOpenChange={(open) => { if (!open) { setAdding(false); setTitle(""); setBody(""); setExpiryDate(defaultExpiryDate()) } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>New Announcement</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-sm"
            />
            <Textarea
              placeholder="Message…"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={4}
              className="text-sm resize-none"
            />
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Expires on</Label>
              <Input
                type="date"
                value={expiryDate}
                min={new Date().toISOString().slice(0, 10)}
                onChange={(e) => setExpiryDate(e.target.value)}
                className="text-sm"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => { setAdding(false); setTitle(""); setBody(""); setExpiryDate(defaultExpiryDate()) }}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleAdd} disabled={saving || !title.trim() || !body.trim()}>
                {saving ? "Posting…" : "Post"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <div className="flex-1 overflow-y-auto p-5 space-y-3 max-h-56">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No announcements.</p>
        ) : (
          <ul className="space-y-3">
            {items.map((a) => {
              const expiryLabel = formatExpiry(a.expiresAt)
              return (
                <li key={a.id} className="group/item">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{a.title}</p>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{a.body}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {a.author.name} · {new Date(a.createdAt).toLocaleDateString("en-US", {
                          month: "short", day: "numeric",
                        })}
                        {expiryLabel && <span className="ml-1 text-muted-foreground/70">· {expiryLabel}</span>}
                      </p>
                    </div>
                    {canPost && (
                      <button
                        onClick={() => handleDelete(a.id)}
                        disabled={deleting === a.id}
                        className="opacity-0 group-hover/item:opacity-100 text-muted-foreground hover:text-destructive transition-all shrink-0 mt-0.5"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
