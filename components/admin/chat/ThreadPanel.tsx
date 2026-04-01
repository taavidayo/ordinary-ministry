"use client"

import { useState, useEffect, useCallback } from "react"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import MessageItem from "./MessageItem"
import MessageInput from "./MessageInput"
import type { MessageWithMeta, CustomEmojiItem } from "@/types/chat"
import { toast } from "sonner"

interface Props {
  channelId: string
  parentMessage: MessageWithMeta
  currentUser: { id: string; role: string }
  customEmojis: CustomEmojiItem[]
  onClose: () => void
}

export default function ThreadPanel({
  channelId,
  parentMessage,
  currentUser,
  customEmojis,
  onClose,
}: Props) {
  const [replies, setReplies] = useState<MessageWithMeta[]>([])

  const loadReplies = useCallback(async () => {
    try {
      const res = await fetch(`/api/channels/${channelId}/messages/${parentMessage.id}/replies`)
      if (!res.ok) return
      const data = await res.json()
      setReplies(data)
    } catch {
      // ignore
    }
  }, [channelId, parentMessage.id])

  useEffect(() => {
    loadReplies()
    const interval = setInterval(loadReplies, 3000)
    const onVisibility = () => { if (!document.hidden) loadReplies() }
    document.addEventListener("visibilitychange", onVisibility)
    return () => {
      clearInterval(interval)
      document.removeEventListener("visibilitychange", onVisibility)
    }
  }, [loadReplies])

  async function handleSend(content: string) {
    const res = await fetch(`/api/channels/${channelId}/messages/${parentMessage.id}/replies`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    })
    if (!res.ok) { toast.error("Failed to send reply"); return }
    const reply = await res.json()
    setReplies((prev) => [...prev, reply])
  }

  async function handleReact(messageId: string, emoji: string) {
    await fetch(`/api/channels/${channelId}/messages/${messageId}/reactions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emoji }),
    })
    await loadReplies()
  }

  async function handleEdit(messageId: string, content: string) {
    const res = await fetch(`/api/channels/${channelId}/messages/${messageId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    })
    if (!res.ok) return
    const updated = await res.json()
    setReplies((prev) => prev.map((r) => (r.id === messageId ? { ...updated, reactions: r.reactions } : r)))
  }

  async function handleDelete(messageId: string) {
    await fetch(`/api/channels/${channelId}/messages/${messageId}`, { method: "DELETE" })
    setReplies((prev) =>
      prev.map((r) =>
        r.id === messageId ? { ...r, deletedAt: new Date().toISOString(), content: "" } : r
      )
    )
  }

  return (
    <div className="w-80 border-l bg-card flex flex-col">
      <div className="p-3 border-b flex items-center justify-between shrink-0">
        <p className="font-semibold text-sm">Thread</p>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        {/* Parent message */}
        <div className="pb-3 border-b mb-3">
          <MessageItem
            message={parentMessage}
            currentUser={currentUser}
            customEmojis={customEmojis}
            isGrouped={false}
            onReply={() => {}}
            onReact={(emoji) => handleReact(parentMessage.id, emoji)}
            onPin={() => {}}
            onEdit={() => {}}
            onDelete={() => {}}
          />
        </div>
        <p className="text-xs text-muted-foreground mb-2">
          {replies.length} {replies.length === 1 ? "reply" : "replies"}
        </p>
        {replies.map((r, i) => (
          <MessageItem
            key={r.id}
            message={r}
            currentUser={currentUser}
            customEmojis={customEmojis}
            isGrouped={
              i > 0 &&
              replies[i - 1].authorId === r.authorId &&
              new Date(r.createdAt).getTime() - new Date(replies[i - 1].createdAt).getTime() < 5 * 60 * 1000
            }
            onReply={() => {}}
            onReact={(emoji) => handleReact(r.id, emoji)}
            onPin={() => {}}
            onEdit={(content) => handleEdit(r.id, content)}
            onDelete={() => handleDelete(r.id)}
          />
        ))}
      </div>

      <div className="border-t p-3 shrink-0">
        <MessageInput
          placeholder="Reply..."
          customEmojis={customEmojis}
          onSend={handleSend}
        />
      </div>
    </div>
  )
}
