"use client"

import { useEffect, useRef, useCallback } from "react"
import MessageItem from "./MessageItem"
import type { MessageWithMeta, CustomEmojiItem } from "@/types/chat"

interface Props {
  channelId: string
  messages: MessageWithMeta[]
  currentUser: { id: string; role: string }
  customEmojis: CustomEmojiItem[]
  onReply: (msg: MessageWithMeta) => void
  onReact: (messageId: string, emoji: string) => void
  onPin: (messageId: string) => void
  onEdit: (messageId: string, content: string) => void
  onDelete: (messageId: string) => void
  onNewMessages: (msgs: MessageWithMeta[]) => void
}

function formatDay(dateStr: string) {
  const d = new Date(dateStr)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  if (d.toDateString() === today.toDateString()) return "Today"
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday"
  return d.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })
}

export default function MessageList({
  channelId,
  messages,
  currentUser,
  customEmojis,
  onReply,
  onReact,
  onPin,
  onEdit,
  onDelete,
  onNewMessages,
}: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)
  const lastIdRef = useRef<string | undefined>(undefined)
  const containerRef = useRef<HTMLDivElement>(null)
  const isAtBottomRef = useRef(true)

  // Track if user is scrolled to bottom
  function handleScroll() {
    const el = containerRef.current
    if (!el) return
    isAtBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80
  }

  // Auto-scroll on new messages if near bottom
  useEffect(() => {
    if (isAtBottomRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" })
    }
    if (messages.length > 0) {
      lastIdRef.current = messages[messages.length - 1].id
    }
  }, [messages])

  const poll = useCallback(async () => {
    if (!lastIdRef.current) return
    try {
      const res = await fetch(
        `/api/channels/${channelId}/messages?after=${lastIdRef.current}&limit=50`
      )
      if (!res.ok) return
      const newMsgs: MessageWithMeta[] = await res.json()
      if (newMsgs.length > 0) onNewMessages(newMsgs)
    } catch {
      // ignore
    }
  }, [channelId, onNewMessages])

  useEffect(() => {
    const interval = setInterval(poll, 3000)
    const onVisibility = () => { if (!document.hidden) poll() }
    document.addEventListener("visibilitychange", onVisibility)
    return () => {
      clearInterval(interval)
      document.removeEventListener("visibilitychange", onVisibility)
    }
  }, [poll])

  // Group messages by day
  const groups: { day: string; msgs: MessageWithMeta[] }[] = []
  for (const msg of messages) {
    const day = formatDay(msg.createdAt)
    const last = groups[groups.length - 1]
    if (last && last.day === day) {
      last.msgs.push(msg)
    } else {
      groups.push({ day, msgs: [msg] })
    }
  }

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto px-4 py-2"
      onScroll={handleScroll}
    >
      {groups.map(({ day, msgs }) => (
        <div key={day}>
          <div className="flex items-center gap-2 my-4">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground font-medium px-2">{day}</span>
            <div className="flex-1 h-px bg-border" />
          </div>
          {msgs.map((msg, i) => {
            const prevMsg = i > 0 ? msgs[i - 1] : null
            const isGrouped =
              !!prevMsg &&
              prevMsg.authorId === msg.authorId &&
              new Date(msg.createdAt).getTime() - new Date(prevMsg.createdAt).getTime() < 5 * 60 * 1000
            return (
              <MessageItem
                key={msg.id}
                message={msg}
                currentUser={currentUser}
                customEmojis={customEmojis}
                isGrouped={isGrouped}
                onReply={() => onReply(msg)}
                onReact={(emoji) => onReact(msg.id, emoji)}
                onPin={() => onPin(msg.id)}
                onEdit={(content) => onEdit(msg.id, content)}
                onDelete={() => onDelete(msg.id)}
              />
            )
          })}
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  )
}
