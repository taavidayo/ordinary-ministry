"use client"

import { useState, useEffect } from "react"
import { Pin, Users, X, Hash, Lock, Settings, Search, Kanban, LayoutDashboard } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import MessageList from "./MessageList"
import MessageInput from "./MessageInput"
import ThreadPanel from "./ThreadPanel"
import BoardPanel from "./BoardPanel"
import SearchPanel from "./SearchPanel"
import ChannelSettingsPanel from "./ChannelSettingsPanel"
import type { ChannelDetail, MessageWithMeta, CustomEmojiItem, PinnedBannerItem } from "@/types/chat"
import { toast } from "sonner"

interface Props {
  channel: ChannelDetail
  currentUser: { id: string; role: string }
  initialMessages: MessageWithMeta[]
  onMetaUpdated?: (patch: { name?: string; description?: string | null; icon?: string | null }) => void
  onArchived?: () => void
  onUnarchived?: () => void
  onDeleted?: () => void
}

type Panel = "thread" | "board" | "search" | "settings" | "members" | null

function ChannelIcon({ channel }: { channel: ChannelDetail }) {
  if (channel.icon) return <span className="text-lg leading-none">{channel.icon}</span>
  if (channel.type === "PRIVATE") return <Lock className="h-4 w-4 text-muted-foreground" />
  return <Hash className="h-4 w-4 text-muted-foreground" />
}

function HeaderBtn({
  active, title, onClick, children,
}: { active: boolean; title: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <Button
      variant={active ? "secondary" : "ghost"}
      size="icon"
      className="h-7 w-7"
      title={title}
      onClick={onClick}
    >
      {children}
    </Button>
  )
}

export default function ChannelView({ channel: initialChannel, currentUser, initialMessages, onMetaUpdated, onArchived, onUnarchived, onDeleted }: Props) {
  const [channel, setChannel] = useState(initialChannel)
  const [messages, setMessages] = useState<MessageWithMeta[]>(initialMessages)
  const [panel, setPanel] = useState<Panel>(null)
  const [threadMessage, setThreadMessage] = useState<MessageWithMeta | null>(null)
  const [customEmojis, setCustomEmojis] = useState<CustomEmojiItem[]>([])
  const [pinnedBanner, setPinnedBanner] = useState<PinnedBannerItem | null>(null)
  const [bannerDismissed, setBannerDismissed] = useState(false)

  const members = channel.members.map((m) => ({ id: m.userId, name: m.user.name }))

  useEffect(() => {
    fetch("/api/custom-emojis").then((r) => r.json()).then(setCustomEmojis).catch(() => {})
  }, [])

  useEffect(() => {
    setBannerDismissed(false)
    fetch(`/api/channels/${channel.id}/pins`)
      .then((r) => r.json())
      .then((pins: { messageId: string; message: { content: string; author: { name: string } } }[]) => {
        if (pins.length > 0) {
          const latest = pins[0]
          setPinnedBanner({ messageId: latest.messageId, content: latest.message.content, authorName: latest.message.author.name })
        } else {
          setPinnedBanner(null)
        }
      })
      .catch(() => {})
  }, [channel.id])

  function togglePanel(p: Panel) {
    setPanel((cur) => {
      if (cur === p) return null
      if (p !== "thread") setThreadMessage(null)
      return p
    })
  }

  function openThread(msg: MessageWithMeta) {
    setThreadMessage(msg)
    setPanel("thread")
  }

  async function handleSend(content: string) {
    const res = await fetch(`/api/channels/${channel.id}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    })
    if (!res.ok) { toast.error("Failed to send message"); return }
    const msg = await res.json()
    setMessages((prev) => [...prev, msg])
  }

  async function handleReact(messageId: string, emoji: string) {
    const res = await fetch(`/api/channels/${channel.id}/messages/${messageId}/reactions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emoji }),
    })
    if (!res.ok) return
    const { action } = await res.json()
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== messageId) return m
        const existing = m.reactions.find((r) => r.emoji === emoji)
        if (action === "added") {
          if (existing) {
            return { ...m, reactions: m.reactions.map((r) => r.emoji === emoji ? { ...r, count: r.count + 1, userIds: [...r.userIds, currentUser.id] } : r) }
          }
          return { ...m, reactions: [...m.reactions, { emoji, count: 1, userIds: [currentUser.id] }] }
        } else {
          return { ...m, reactions: m.reactions.map((r) => r.emoji === emoji ? { ...r, count: r.count - 1, userIds: r.userIds.filter((u) => u !== currentUser.id) } : r).filter((r) => r.count > 0) }
        }
      })
    )
  }

  async function handlePin(messageId: string) {
    const res = await fetch(`/api/channels/${channel.id}/pins`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messageId }),
    })
    if (!res.ok) { toast.error("Failed to pin message"); return }
    toast.success("Message pinned")
    const msg = messages.find((m) => m.id === messageId)
    if (msg) {
      setPinnedBanner({ messageId, content: msg.content, authorName: msg.author.name })
      setBannerDismissed(false)
    }
  }

  async function handleEdit(messageId: string, content: string) {
    const res = await fetch(`/api/channels/${channel.id}/messages/${messageId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    })
    if (!res.ok) { toast.error("Failed to edit message"); return }
    const updated = await res.json()
    setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...updated, reactions: m.reactions } : m)))
  }

  async function handleDelete(messageId: string) {
    const res = await fetch(`/api/channels/${channel.id}/messages/${messageId}`, { method: "DELETE" })
    if (!res.ok) { toast.error("Failed to delete message"); return }
    setMessages((prev) => prev.map((m) => m.id === messageId ? { ...m, deletedAt: new Date().toISOString(), content: "" } : m))
  }

  function handleNewMessages(newMsgs: MessageWithMeta[]) {
    setMessages((prev) => {
      const existingIds = new Set(prev.map((m) => m.id))
      const toAdd = newMsgs.filter((m) => !existingIds.has(m.id))
      return toAdd.length ? [...prev, ...toAdd] : prev
    })
  }

  function handleUnpin(messageId: string) {
    if (pinnedBanner?.messageId === messageId) setPinnedBanner(null)
  }

  function handleChannelUpdated(patch: { name?: string; description?: string | null; icon?: string | null }) {
    setChannel((prev) => ({ ...prev, ...patch }))
    onMetaUpdated?.(patch)
  }

  const showBanner = pinnedBanner && !bannerDismissed

  return (
    <div className="flex flex-1 overflow-hidden">
      <div className="flex flex-col flex-1 overflow-hidden">

        {/* Header */}
        <div className="border-b px-4 py-2 flex items-center justify-between shrink-0 bg-card">
          <div className="flex items-center gap-2 min-w-0">
            <ChannelIcon channel={channel} />
            <div className="min-w-0">
              <p className="font-semibold text-sm leading-tight">{channel.name}</p>
              {channel.description && (
                <p className="text-xs text-muted-foreground truncate">{channel.description}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-0.5 shrink-0 ml-2">
            <HeaderBtn active={panel === "search"} title="Search" onClick={() => togglePanel("search")}>
              <Search className="h-4 w-4" />
            </HeaderBtn>
            <HeaderBtn active={panel === "board"} title="Board (pins & links)" onClick={() => togglePanel("board")}>
              <Kanban className="h-4 w-4" />
            </HeaderBtn>
            {channel.teamId && (
              <Link href={`/mychurch/teams/${channel.teamId}`}>
                <Button variant="ghost" size="icon" className="h-7 w-7" title="Team dashboard">
                  <LayoutDashboard className="h-4 w-4" />
                </Button>
              </Link>
            )}
            {channel.groupId && (
              <Link href={`/mychurch/groups/${channel.groupId}`}>
                <Button variant="ghost" size="icon" className="h-7 w-7" title="Group dashboard">
                  <LayoutDashboard className="h-4 w-4" />
                </Button>
              </Link>
            )}
            <HeaderBtn active={panel === "members"} title="Members" onClick={() => togglePanel("members")}>
              <Users className="h-4 w-4" />
            </HeaderBtn>
            <HeaderBtn active={panel === "settings"} title="Channel settings" onClick={() => togglePanel("settings")}>
              <Settings className="h-4 w-4" />
            </HeaderBtn>
          </div>
        </div>

        {/* Archived banner */}
        {channel.archivedAt && (
          <div className="border-b bg-muted px-4 py-2 flex items-center gap-2 shrink-0">
            <span className="text-xs text-muted-foreground flex-1">This channel is archived. New messages cannot be sent.</span>
          </div>
        )}

        {/* Pinned banner */}
        {showBanner && (
          <div className="border-b bg-amber-50 px-4 py-2 flex items-start gap-2 shrink-0">
            <Pin className="h-3.5 w-3.5 text-amber-600 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-amber-800 leading-tight">Pinned · {pinnedBanner.authorName}</p>
              <p className="text-xs text-amber-900 truncate mt-0.5">
                {pinnedBanner.content || <em>Deleted message</em>}
              </p>
            </div>
            <button className="text-amber-500 hover:text-amber-700 shrink-0 mt-0.5" onClick={() => setBannerDismissed(true)}>
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Messages */}
        <MessageList
          channelId={channel.id}
          messages={messages}
          currentUser={currentUser}
          customEmojis={customEmojis}
          onReply={openThread}
          onReact={handleReact}
          onPin={handlePin}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onNewMessages={handleNewMessages}
        />

        {/* Input */}
        {!channel.archivedAt && (
          <div className="border-t p-3 shrink-0 bg-card">
            <MessageInput
              placeholder={`Message ${channel.icon ?? "#"}${channel.name}`}
              customEmojis={customEmojis}
              members={members}
              onSend={handleSend}
            />
          </div>
        )}
      </div>

      {/* Side panels */}
      {panel === "thread" && threadMessage && (
        <ThreadPanel
          channelId={channel.id}
          parentMessage={threadMessage}
          currentUser={currentUser}
          customEmojis={customEmojis}
          onClose={() => togglePanel(null)}
        />
      )}
      {panel === "board" && (
        <BoardPanel
          channelId={channel.id}
          currentUser={currentUser}
          onClose={() => togglePanel(null)}
          onUnpin={handleUnpin}
        />
      )}
      {panel === "search" && (
        <SearchPanel
          channelId={channel.id}
          customEmojis={customEmojis}
          onClose={() => togglePanel(null)}
        />
      )}
      {panel === "settings" && (
        <ChannelSettingsPanel
          channel={channel}
          currentUser={currentUser}
          onClose={() => togglePanel(null)}
          onUpdated={handleChannelUpdated}
          onArchived={onArchived}
          onUnarchived={onUnarchived}
          onDeleted={onDeleted}
        />
      )}
      {panel === "members" && (
        <div className="w-64 border-l bg-card flex flex-col">
          <div className="p-3 border-b flex items-center justify-between shrink-0">
            <p className="font-semibold text-sm">Members ({channel.members.length})</p>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => togglePanel(null)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {channel.members.map((m) => (
              <div key={m.userId} className="flex items-center gap-2 px-2 py-1.5 rounded text-sm">
                {m.user.avatar
                  ? <Image src={m.user.avatar} alt={m.user.name} width={24} height={24} className="h-6 w-6 rounded-full object-cover shrink-0" />
                  : <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium shrink-0">{m.user.name[0].toUpperCase()}</div>
                }
                <span>{m.user.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
