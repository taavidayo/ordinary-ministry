"use client"

import { useState, useEffect } from "react"
import { X, Pin, Link2, Trash2, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { PinnedMessage, ChannelResourceItem } from "@/types/chat"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface Props {
  channelId: string
  currentUser: { id: string; role: string }
  onClose: () => void
  onUnpin?: (messageId: string) => void
}

type Tab = "pinned" | "links"

export default function BoardPanel({ channelId, currentUser, onClose, onUnpin }: Props) {
  const [tab, setTab] = useState<Tab>("pinned")
  const [pins, setPins] = useState<PinnedMessage[]>([])
  const [resources, setResources] = useState<ChannelResourceItem[]>([])
  const [loadingPins, setLoadingPins] = useState(true)
  const [loadingLinks, setLoadingLinks] = useState(true)
  const [addingLink, setAddingLink] = useState(false)
  const [linkTitle, setLinkTitle] = useState("")
  const [linkUrl, setLinkUrl] = useState("")

  useEffect(() => {
    fetch(`/api/channels/${channelId}/pins`)
      .then((r) => r.json()).then(setPins).catch(() => {}).finally(() => setLoadingPins(false))
    fetch(`/api/channels/${channelId}/resources`)
      .then((r) => r.json()).then(setResources).catch(() => {}).finally(() => setLoadingLinks(false))
  }, [channelId])

  async function handleUnpin(messageId: string) {
    const res = await fetch(`/api/channels/${channelId}/pins/${messageId}`, { method: "DELETE" })
    if (!res.ok) { toast.error("Failed to unpin"); return }
    setPins((prev) => prev.filter((p) => p.messageId !== messageId))
    onUnpin?.(messageId)
  }

  async function handleAddLink() {
    if (!linkTitle.trim() || !linkUrl.trim()) return
    const res = await fetch(`/api/channels/${channelId}/resources`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: linkTitle.trim(), url: linkUrl.trim() }),
    })
    if (!res.ok) { toast.error("Failed to add link"); return }
    const resource = await res.json()
    setResources((prev) => [resource, ...prev])
    setLinkTitle(""); setLinkUrl(""); setAddingLink(false)
  }

  async function handleDeleteLink(id: string) {
    const res = await fetch(`/api/channels/${channelId}/resources/${id}`, { method: "DELETE" })
    if (!res.ok) { toast.error("Failed to remove link"); return }
    setResources((prev) => prev.filter((r) => r.id !== id))
  }

  const isAdmin = currentUser.role === "ADMIN"

  return (
    <div className="w-80 border-l bg-card flex flex-col">
      {/* Header */}
      <div className="p-3 border-b flex items-center justify-between shrink-0">
        <p className="font-semibold text-sm">Board</p>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex border-b shrink-0">
        <button
          onClick={() => setTab("pinned")}
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium transition-colors",
            tab === "pinned"
              ? "border-b-2 border-primary text-primary"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Pin className="h-3.5 w-3.5" /> Pinned
          {pins.length > 0 && (
            <span className="bg-muted text-muted-foreground rounded-full px-1.5 py-0.5 text-[10px]">
              {pins.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab("links")}
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium transition-colors",
            tab === "links"
              ? "border-b-2 border-primary text-primary"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Link2 className="h-3.5 w-3.5" /> Links
          {resources.length > 0 && (
            <span className="bg-muted text-muted-foreground rounded-full px-1.5 py-0.5 text-[10px]">
              {resources.length}
            </span>
          )}
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {tab === "pinned" && (
          <div className="p-3 space-y-3">
            {loadingPins && <p className="text-sm text-muted-foreground">Loading...</p>}
            {!loadingPins && pins.length === 0 && (
              <p className="text-sm text-muted-foreground">No pinned messages yet.</p>
            )}
            {pins.map((p) => (
              <div key={p.messageId} className="border rounded-lg p-3 space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-semibold">{p.message.author.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(p.message.createdAt).toLocaleDateString(undefined, {
                        month: "short", day: "numeric", year: "numeric"
                      })}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs text-muted-foreground hover:text-destructive"
                    onClick={() => handleUnpin(p.messageId)}
                  >
                    Unpin
                  </Button>
                </div>
                <p className="text-sm leading-snug">
                  {p.message.content || <em className="text-muted-foreground">Deleted message</em>}
                </p>
              </div>
            ))}
          </div>
        )}

        {tab === "links" && (
          <div className="p-3 space-y-2">
            {/* Add link form */}
            {addingLink ? (
              <div className="border rounded-lg p-3 space-y-2 mb-3">
                <Input
                  placeholder="Title"
                  value={linkTitle}
                  onChange={(e) => setLinkTitle(e.target.value)}
                  className="h-8 text-sm"
                />
                <Input
                  placeholder="https://..."
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  className="h-8 text-sm"
                  onKeyDown={(e) => { if (e.key === "Enter") handleAddLink() }}
                />
                <div className="flex gap-2">
                  <Button size="sm" className="h-7 text-xs" onClick={handleAddLink}
                    disabled={!linkTitle.trim() || !linkUrl.trim()}>
                    Add
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 text-xs"
                    onClick={() => { setAddingLink(false); setLinkTitle(""); setLinkUrl("") }}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="w-full h-8 text-xs mb-1"
                onClick={() => setAddingLink(true)}
              >
                <Plus className="h-3.5 w-3.5 mr-1" /> Add link
              </Button>
            )}

            {loadingLinks && <p className="text-sm text-muted-foreground">Loading...</p>}
            {!loadingLinks && resources.length === 0 && (
              <p className="text-sm text-muted-foreground">No links yet.</p>
            )}
            {resources.map((r) => (
              <div key={r.id} className="flex items-start gap-2 group border rounded-lg p-2.5">
                <Link2 className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <a
                    href={r.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-primary hover:underline block truncate"
                  >
                    {r.title}
                  </a>
                  <p className="text-xs text-muted-foreground truncate">{r.url}</p>
                  <p className="text-xs text-muted-foreground">by {r.addedBy.name}</p>
                </div>
                {(r.addedById === currentUser.id || isAdmin) && (
                  <Button
                    variant="ghost" size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 shrink-0 text-destructive hover:text-destructive"
                    onClick={() => handleDeleteLink(r.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
