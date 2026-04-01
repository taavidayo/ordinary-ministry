"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Hash, Lock, Users, Plus, LogIn, Search, AtSign } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import CreateChannelDialog from "./CreateChannelDialog"
import type { ChannelSummary, ChatCategoryItem } from "@/types/chat"
import type { MobileTab } from "./ChatLayout"
import { toast } from "sonner"

interface Props {
  channels: ChannelSummary[]
  archivedChannels: ChannelSummary[]
  teams: { id: string; name: string }[]
  categories: ChatCategoryItem[]
  currentUser: { id: string; role: string }
  activeChannelId?: string
  activeTab: MobileTab
  onChannelSelect: (id: string) => void
  onChannelCreated: (c: ChannelSummary) => void
  onChannelJoined: (id: string) => void
  onChannelCategoryChanged: (channelId: string, categoryId: string | null) => void
  onCategoryCreated: (cat: ChatCategoryItem) => void
  onCategoryUpdated: (cat: ChatCategoryItem) => void
  onCategoryDeleted: (id: string) => void
  onChannelUnarchived: (id: string) => void
  onChannelReordered: (orderedIds: string[], categoryId: string | null) => void
}

function ChannelTypeIcon({ type }: { type: ChannelSummary["type"] }) {
  if (type === "PRIVATE") return <Lock className="h-4 w-4 shrink-0 text-muted-foreground" />
  if (type === "TEAM") return <Users className="h-4 w-4 shrink-0 text-muted-foreground" />
  return <Hash className="h-4 w-4 shrink-0 text-muted-foreground" />
}

function filterByTab(channels: ChannelSummary[], tab: MobileTab): ChannelSummary[] {
  switch (tab) {
    case "channels":
      return channels.filter((c) => c.type === "PUBLIC" || c.type === "TEAM" || c.type === "GROUP")
    case "dms":
      return channels.filter((c) => c.type === "PRIVATE")
    case "mentions":
      // Mentions: show all channels where user is a member (mentions are message-level,
      // without full message indexing we show member channels as a fallback)
      return channels.filter((c) => c.isMember)
    default:
      return channels
  }
}

export default function MobileChannelList({
  channels,
  archivedChannels,
  teams,
  currentUser,
  activeChannelId,
  activeTab,
  onChannelSelect,
  onChannelCreated,
  onChannelJoined,
}: Props) {
  const router = useRouter()
  const [createOpen, setCreateOpen] = useState(false)
  const [joiningId, setJoiningId] = useState<string | null>(null)
  const [query, setQuery] = useState("")

  const filtered = filterByTab(channels, activeTab)
  const searched = query.trim()
    ? filtered.filter((c) => c.name.toLowerCase().includes(query.toLowerCase()))
    : filtered

  async function handleJoin(channelId: string) {
    setJoiningId(channelId)
    try {
      await fetch(`/api/channels/${channelId}/join`, { method: "POST" })
      onChannelJoined(channelId)
      onChannelSelect(channelId)
    } catch {
      toast.error("Failed to join channel")
    } finally {
      setJoiningId(null)
    }
  }

  const emptyMessages: Record<MobileTab, string> = {
    channels: "No channels yet. Create one!",
    dms: "No direct messages yet.",
    mentions: "No channels with mentions.",
  }

  const tabLabel: Record<MobileTab, string> = {
    channels: "Channels",
    dms: "Direct Messages",
    mentions: "Mentions",
  }

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2 shrink-0">
        <p className="text-base font-semibold">{tabLabel[activeTab]}</p>
        {(activeTab === "channels" || activeTab === "dms") && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Search */}
      <div className="px-4 pb-3 shrink-0">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-8 h-8 text-sm bg-muted/40 border-muted"
          />
        </div>
      </div>

      {/* Mentions placeholder */}
      {activeTab === "mentions" && (
        <div className="px-4 pb-2 shrink-0">
          <div className="flex items-center gap-2 rounded-md bg-muted/40 px-3 py-2">
            <AtSign className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <p className="text-xs text-muted-foreground">
              Channels where you&apos;ve been mentioned recently
            </p>
          </div>
        </div>
      )}

      {/* Channel list */}
      <div className="flex-1 overflow-y-auto px-2">
        {searched.length === 0 ? (
          <p className="px-3 py-8 text-center text-sm text-muted-foreground">
            {query ? "No results." : emptyMessages[activeTab]}
          </p>
        ) : (
          <ul className="space-y-0.5 py-1">
            {searched.map((c) => (
              <li key={c.id}>
                <button
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left transition-colors",
                    activeChannelId === c.id
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-accent/60"
                  )}
                  onClick={() => {
                    if (!c.isMember && c.type === "PUBLIC") {
                      handleJoin(c.id)
                    } else {
                      onChannelSelect(c.id)
                    }
                  }}
                  disabled={joiningId === c.id}
                >
                  {/* Icon / emoji */}
                  <div className={cn(
                    "h-10 w-10 rounded-full flex items-center justify-center shrink-0 text-lg",
                    activeChannelId === c.id ? "bg-white/20" : "bg-muted"
                  )}>
                    {c.icon ? (
                      <span>{c.icon}</span>
                    ) : (
                      <ChannelTypeIcon type={c.type} />
                    )}
                  </div>

                  {/* Name + description */}
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      "text-sm font-medium truncate",
                      activeChannelId === c.id ? "text-primary-foreground" : "text-foreground"
                    )}>
                      {c.name}
                    </p>
                    {c.description && (
                      <p className={cn(
                        "text-xs truncate mt-0.5",
                        activeChannelId === c.id ? "text-primary-foreground/70" : "text-muted-foreground"
                      )}>
                        {c.description}
                      </p>
                    )}
                  </div>

                  {/* Join indicator for non-members */}
                  {!c.isMember && c.type === "PUBLIC" && (
                    <LogIn className={cn(
                      "h-4 w-4 shrink-0",
                      activeChannelId === c.id ? "text-primary-foreground/70" : "text-muted-foreground"
                    )} />
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}

        {/* Archived section */}
        {archivedChannels.length > 0 && activeTab === "channels" && !query && (
          <div className="mt-4 pt-4 border-t">
            <p className="px-3 pb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Archived
            </p>
            <ul className="space-y-0.5">
              {archivedChannels.slice(0, 5).map((c) => (
                <li key={c.id}>
                  <button
                    className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left opacity-60 hover:opacity-80 hover:bg-accent/60 transition-all"
                    onClick={() => onChannelSelect(c.id)}
                  >
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                      {c.icon ? <span className="text-lg">{c.icon}</span> : <ChannelTypeIcon type={c.type} />}
                    </div>
                    <p className="text-sm truncate">{c.name}</p>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <CreateChannelDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        teams={teams}
        onCreated={(c) => {
          onChannelCreated(c)
          router.push(`/mychurch/chat/${c.id}`)
        }}
      />
    </div>
  )
}
