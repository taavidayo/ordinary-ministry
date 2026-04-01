"use client"

import { useState, useEffect } from "react"
import { X, Link2, Trash2, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { ChannelResourceItem } from "@/types/chat"
import { toast } from "sonner"

interface Props {
  channelId: string
  currentUser: { id: string; role: string }
  onClose: () => void
}

export default function ResourcesPanel({ channelId, currentUser, onClose }: Props) {
  const [resources, setResources] = useState<ChannelResourceItem[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [title, setTitle] = useState("")
  const [url, setUrl] = useState("")

  useEffect(() => {
    fetch(`/api/channels/${channelId}/resources`)
      .then((r) => r.json())
      .then(setResources)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [channelId])

  async function handleAdd() {
    if (!title.trim() || !url.trim()) return
    const res = await fetch(`/api/channels/${channelId}/resources`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: title.trim(), url: url.trim() }),
    })
    if (!res.ok) { toast.error("Failed to add resource"); return }
    const resource = await res.json()
    setResources((prev) => [resource, ...prev])
    setTitle("")
    setUrl("")
    setAdding(false)
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/channels/${channelId}/resources/${id}`, { method: "DELETE" })
    if (!res.ok) { toast.error("Failed to remove resource"); return }
    setResources((prev) => prev.filter((r) => r.id !== id))
  }

  const isAdmin = currentUser.role === "ADMIN"

  return (
    <div className="w-72 border-l bg-card flex flex-col">
      <div className="p-3 border-b flex items-center justify-between shrink-0">
        <div className="flex items-center gap-1.5">
          <Link2 className="h-4 w-4" />
          <p className="font-semibold text-sm">Resources</p>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            title="Add resource"
            onClick={() => setAdding((v) => !v)}
          >
            <Plus className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {adding && (
        <div className="p-3 border-b space-y-2">
          <Input
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="h-8 text-sm"
          />
          <Input
            placeholder="URL"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="h-8 text-sm"
            onKeyDown={(e) => { if (e.key === "Enter") handleAdd() }}
          />
          <div className="flex gap-2">
            <Button size="sm" className="h-7 text-xs" onClick={handleAdd}>Add</Button>
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setAdding(false)}>Cancel</Button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {loading && <p className="text-sm text-muted-foreground">Loading...</p>}
        {!loading && resources.length === 0 && (
          <p className="text-sm text-muted-foreground">No resources yet. Add a link!</p>
        )}
        {resources.map((r) => (
          <div key={r.id} className="flex items-start gap-2 group">
            <Link2 className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
            <div className="flex-1 min-w-0">
              <a
                href={r.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-primary hover:underline truncate block"
              >
                {r.title}
              </a>
              <p className="text-xs text-muted-foreground">Added by {r.addedBy.name}</p>
            </div>
            {(r.addedById === currentUser.id || isAdmin) && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-0 group-hover:opacity-100 shrink-0 text-destructive hover:text-destructive"
                onClick={() => handleDelete(r.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
