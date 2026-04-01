"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Hash, MessageCircle, AtSign } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import ChatSidebar from "./ChatSidebar"
import ChannelView from "./ChannelView"
import MobileChannelList from "./MobileChannelList"
import type { ChannelSummary, ChannelDetail, MessageWithMeta, ChatCategoryItem } from "@/types/chat"

export type MobileTab = "channels" | "dms" | "mentions"

interface Props {
  channels: ChannelSummary[]
  archivedChannels: ChannelSummary[]
  teams: { id: string; name: string }[]
  categories: ChatCategoryItem[]
  currentUser: { id: string; role: string }
  activeChannel?: ChannelDetail
  initialMessages?: MessageWithMeta[]
}

// Spring config matching the rest of the app's framer-motion usage
const slideTransition = { type: "spring" as const, damping: 32, stiffness: 320 }

function ChatBottomNav({ activeTab, onChange }: { activeTab: MobileTab; onChange: (t: MobileTab) => void }) {
  const tabs: { id: MobileTab; label: string; icon: React.ElementType }[] = [
    { id: "channels", label: "Channels", icon: Hash },
    { id: "dms", label: "Direct", icon: MessageCircle },
    { id: "mentions", label: "Mentions", icon: AtSign },
  ]
  return (
    <nav className="flex border-t bg-card shrink-0 pb-safe">
      {tabs.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          onClick={() => onChange(id)}
          className={cn(
            "flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium transition-colors",
            activeTab === id ? "text-primary" : "text-muted-foreground"
          )}
        >
          <Icon className={cn("h-5 w-5", activeTab === id && "stroke-[2.5]")} />
          {label}
        </button>
      ))}
    </nav>
  )
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
  const [mobileTab, setMobileTab] = useState<MobileTab>("channels")
  const [slideDir, setSlideDir] = useState<"forward" | "back">("forward")

  const showingChannel = !!activeChannel

  function navigateToChannel(id: string) {
    setSlideDir("forward")
    router.push(`/mychurch/chat/${id}`)
  }

  function handleBack() {
    setSlideDir("back")
    router.push("/mychurch/chat")
  }

  // ── Shared handlers ──────────────────────────────────────────────────────
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
    const update = (list: ChannelSummary[]) =>
      list.map((c) => (c.id === channelId ? { ...c, ...patch } : c))
    setChannels(update)
    setArchivedChannels(update)
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
      return prev
        .map((c) => (orderMap.has(c.id) ? { ...c, order: orderMap.get(c.id)!, categoryId } : c))
        .sort((a, b) => {
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
    setChannels((prev) => prev.map((c) => (c.categoryId === id ? { ...c, categoryId: null } : c)))
  }

  const sidebarProps = {
    channels,
    archivedChannels,
    teams,
    categories,
    currentUser,
    activeChannelId: activeChannel?.id,
    onChannelCreated: handleChannelCreated,
    onChannelJoined: handleChannelJoined,
    onChannelCategoryChanged: handleChannelCategoryChanged,
    onCategoryCreated: handleCategoryCreated,
    onCategoryUpdated: handleCategoryUpdated,
    onCategoryDeleted: handleCategoryDeleted,
    onChannelUnarchived: handleChannelUnarchived,
    onChannelReordered: handleChannelReordered,
  }

  return (
    <div className="flex w-full h-full overflow-hidden">

      {/* ── Desktop: sidebar + main ──────────────────────────────────────── */}
      <div className="hidden md:flex w-full h-full overflow-hidden">
        <ChatSidebar {...sidebarProps} />
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

      {/* ── Mobile: full-page with slide animation + bottom nav ─────────── */}
      <div className="md:hidden flex flex-col w-full h-full overflow-hidden bg-background">
        {/* Animated content area */}
        <div className="flex-1 relative overflow-hidden">
          <AnimatePresence initial={false} mode="popLayout">
            {!showingChannel ? (
              <motion.div
                key="room-list"
                className="absolute inset-0 overflow-hidden"
                initial={slideDir === "back" ? { x: "-25%", opacity: 0.6 } : false}
                animate={{ x: 0, opacity: 1 }}
                exit={slideDir === "forward" ? { x: "-25%", opacity: 0.6 } : { x: "100%", opacity: 0 }}
                transition={slideTransition}
              >
                <MobileChannelList
                  {...sidebarProps}
                  activeTab={mobileTab}
                  onChannelSelect={navigateToChannel}
                />
              </motion.div>
            ) : (
              <motion.div
                key={`channel-${activeChannel.id}`}
                className="absolute inset-0 overflow-hidden"
                initial={slideDir === "forward" ? { x: "100%", opacity: 0 } : { x: "-25%", opacity: 0.6 }}
                animate={{ x: 0, opacity: 1 }}
                exit={slideDir === "forward" ? { x: "-25%", opacity: 0.6 } : { x: "100%", opacity: 0 }}
                transition={slideTransition}
              >
                <ChannelView
                  channel={activeChannel}
                  currentUser={currentUser}
                  initialMessages={initialMessages}
                  onBack={handleBack}
                  onMetaUpdated={(patch) => handleChannelMetaUpdated(activeChannel.id, patch)}
                  onArchived={() => handleChannelArchived(activeChannel.id)}
                  onUnarchived={() => handleChannelUnarchived(activeChannel.id)}
                  onDeleted={() => handleChannelDeleted(activeChannel.id)}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Bottom nav — only when showing the room list */}
        {!showingChannel && (
          <ChatBottomNav activeTab={mobileTab} onChange={setMobileTab} />
        )}
      </div>
    </div>
  )
}
