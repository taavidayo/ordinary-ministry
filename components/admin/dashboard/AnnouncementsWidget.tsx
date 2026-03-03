"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Megaphone, Plus, Trash2, X } from "lucide-react"
import { toast } from "sonner"

export interface AnnouncementItem {
  id: string
  title: string
  body: string
  createdAt: string
  author: { id: string; name: string }
}

interface Props {
  announcements: AnnouncementItem[]
  isAdmin: boolean
  onNew?: (a: AnnouncementItem) => void
}

export default function AnnouncementsWidget({ announcements: initial, isAdmin, onNew }: Props) {
  const [items, setItems] = useState(initial)
  const [adding, setAdding] = useState(false)
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  async function handleAdd() {
    if (!title.trim() || !body.trim()) return
    setSaving(true)
    const res = await fetch("/api/announcements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: title.trim(), body: body.trim() }),
    })
    setSaving(false)
    if (!res.ok) { toast.error("Failed to post"); return }
    const created: AnnouncementItem = await res.json()
    setItems((prev) => [created, ...prev])
    setTitle(""); setBody(""); setAdding(false)
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

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-5 py-3.5 border-b shrink-0">
        <Megaphone className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-semibold">Announcements</span>
        {isAdmin && !adding && (
          <button
            onClick={() => setAdding(true)}
            className="ml-auto text-muted-foreground hover:text-foreground transition-colors"
            title="New announcement"
          >
            <Plus className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-3 max-h-56">
        {adding && (
          <div className="border rounded-lg p-3 space-y-2 bg-muted/40">
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
              rows={3}
              className="text-sm resize-none"
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleAdd} disabled={saving || !title.trim() || !body.trim()}>
                {saving ? "Posting…" : "Post"}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setAdding(false); setTitle(""); setBody("") }}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}

        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No announcements.</p>
        ) : (
          <ul className="space-y-3">
            {items.map((a) => (
              <li key={a.id} className="group/item">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{a.title}</p>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{a.body}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {a.author.name} · {new Date(a.createdAt).toLocaleDateString("en-US", {
                        month: "short", day: "numeric",
                      })}
                    </p>
                  </div>
                  {isAdmin && (
                    <button
                      onClick={() => handleDelete(a.id)}
                      disabled={deleting === a.id}
                      className="opacity-0 group-hover/item:opacity-100 text-muted-foreground hover:text-destructive transition-all shrink-0 mt-0.5"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
