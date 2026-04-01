"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import ChatSidebar from "./ChatSidebar"
import ChannelView from "./ChannelView"
import type { ChannelSummary, ChannelDetail, MessageWithMeta, ChatCategoryItem } from "@/types/chat"

interface Props {
  channels: ChannelSummary[]
  archivedChannels: ChannelSummary[]
  teams: { id: string; name: string }[]
  categories: ChatCategoryItem[]
  currentUser: { id: string; role: string }
  activeChannel?: ChannelDetail
  initialMessages?: MessageWithMeta[]
}

export default function ChatLayout({
  channels: initialChannels,
  archivedChannels: initialArchivedChannels,
  teams,
  categories: initialCategories,
  currentUser,
  activeChannel,
  initialMessages = [],
}: Props) {
  const router = useRouter()
  const [channels, setChannels] = useState<ChannelSummary[]>(initialChannels)
  const [archivedChannels, setArchivedChannels] = useState<ChannelSummary[]>(initialArchivedChannels)
  const [categories, setCategories] = useState<ChatCategoryItem[]>(initialCategories)

  function handleChannelCreated(c: ChannelSummary) {
    setChannels((prev) => [...prev, c])
  }

  function handleChannelJoined(id: string) {
    setChannels((prev) =>
      prev.map((c) => (c.id === id ? { ...c, isMember: true, categoryId: c.categoryId ?? null } : c))
    )
  }

  function handleChannelCategoryChanged(channelId: string, categoryId: string | null) {
    setChannels((prev) =>
      prev.map((c) => (c.id === channelId ? { ...c, categoryId } : c))
    )
  }

  function handleChannelMetaUpdated(
    channelId: string,
    patch: { name?: string; description?: string | null; icon?: string | null }
  ) {
    setChannels((prev) =>
      prev.map((c) => (c.id === channelId ? { ...c, ...patch } : c))
    )
    setArchivedChannels((prev) =>
      prev.map((c) => (c.id === channelId ? { ...c, ...patch } : c))
    )
  }

  function handleChannelArchived(channelId: string) {
    const ch = channels.find((c) => c.id === channelId)
    if (ch) {
      setChannels((prev) => prev.filter((c) => c.id !== channelId))
      setArchivedChannels((prev) => [{ ...ch, archivedAt: new Date().toISOString() }, ...prev])
    }
    if (activeChannel?.id === channelId) router.push("/mychurch/chat")
  }

  function handleChannelUnarchived(channelId: string) {
    const ch = archivedChannels.find((c) => c.id === channelId)
    if (ch) {
      setArchivedChannels((prev) => prev.filter((c) => c.id !== channelId))
      setChannels((prev) => [...prev, { ...ch, archivedAt: null, order: prev.length }])
    }
  }

  function handleChannelReordered(orderedIds: string[], categoryId: string | null) {
    setChannels((prev) => {
      const orderMap = new Map(orderedIds.map((id, i) => [id, i]))
      return prev.map((c) => {
        if (orderMap.has(c.id)) return { ...c, order: orderMap.get(c.id)!, categoryId }
        return c
      }).sort((a, b) => {
        const aCat = a.categoryId ?? "z"
        const bCat = b.categoryId ?? "z"
        if (aCat !== bCat) return aCat.localeCompare(bCat)
        return a.order - b.order
      })
    })
  }

  function handleChannelDeleted(channelId: string) {
    setChannels((prev) => prev.filter((c) => c.id !== channelId))
    setArchivedChannels((prev) => prev.filter((c) => c.id !== channelId))
    if (activeChannel?.id === channelId) router.push("/mychurch/chat")
  }

  function handleCategoryCreated(cat: ChatCategoryItem) {
    setCategories((prev) => [...prev, cat])
  }

  function handleCategoryUpdated(cat: ChatCategoryItem) {
    setCategories((prev) => prev.map((c) => (c.id === cat.id ? cat : c)))
  }

  function handleCategoryDeleted(id: string) {
    setCategories((prev) => prev.filter((c) => c.id !== id))
    setChannels((prev) =>
      prev.map((c) => (c.categoryId === id ? { ...c, categoryId: null } : c))
    )
  }

  return (
    <div className="flex w-full h-full overflow-hidden">
      <ChatSidebar
        channels={channels}
        archivedChannels={archivedChannels}
        teams={teams}
        categories={categories}
        currentUser={currentUser}
        activeChannelId={activeChannel?.id}
        onChannelCreated={handleChannelCreated}
        onChannelJoined={handleChannelJoined}
        onChannelCategoryChanged={handleChannelCategoryChanged}
        onCategoryCreated={handleCategoryCreated}
        onCategoryUpdated={handleCategoryUpdated}
        onCategoryDeleted={handleCategoryDeleted}
        onChannelUnarchived={handleChannelUnarchived}
        onChannelReordered={handleChannelReordered}
      />
      <div className="flex-1 flex overflow-hidden">
        {activeChannel ? (
          <ChannelView
            channel={activeChannel}
            currentUser={currentUser}
            initialMessages={initialMessages}
            onMetaUpdated={(patch) => handleChannelMetaUpdated(activeChannel.id, patch)}
            onArchived={() => handleChannelArchived(activeChannel.id)}
            onUnarchived={() => handleChannelUnarchived(activeChannel.id)}
            onDeleted={() => handleChannelDeleted(activeChannel.id)}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <p className="text-lg font-medium mb-1">Select a channel</p>
              <p className="text-sm">Choose a channel from the sidebar to start chatting</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
