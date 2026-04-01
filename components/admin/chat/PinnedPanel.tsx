"use client"

import { useState, useEffect } from "react"
import { X, Pin } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { PinnedMessage } from "@/types/chat"
import { toast } from "sonner"

interface Props {
  channelId: string
  currentUser: { id: string; role: string }
  onClose: () => void
  onUnpin?: (messageId: string) => void
}

export default function PinnedPanel({ channelId, currentUser, onClose, onUnpin }: Props) {
  const [pins, setPins] = useState<PinnedMessage[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/channels/${channelId}/pins`)
      .then((r) => r.json())
      .then(setPins)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [channelId])

  async function handleUnpin(messageId: string) {
    const res = await fetch(`/api/channels/${channelId}/pins/${messageId}`, { method: "DELETE" })
    if (!res.ok) { toast.error("Failed to unpin"); return }
    setPins((prev) => prev.filter((p) => p.messageId !== messageId))
    onUnpin?.(messageId)
  }

  return (
    <div className="w-72 border-l bg-card flex flex-col">
      <div className="p-3 border-b flex items-center justify-between shrink-0">
        <div className="flex items-center gap-1.5">
          <Pin className="h-4 w-4" />
          <p className="font-semibold text-sm">Pinned Messages</p>
        </div>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {loading && <p className="text-sm text-muted-foreground">Loading...</p>}
        {!loading && pins.length === 0 && (
          <p className="text-sm text-muted-foreground">No pinned messages yet.</p>
        )}
        {pins.map((p) => (
          <div key={p.messageId} className="border rounded-lg p-3 space-y-1">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs font-medium">{p.message.author.name}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(p.message.createdAt).toLocaleDateString()}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs text-muted-foreground"
                onClick={() => handleUnpin(p.messageId)}
              >
                Unpin
              </Button>
            </div>
            <p className="text-sm">{p.message.content || <em className="text-muted-foreground">Deleted</em>}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
