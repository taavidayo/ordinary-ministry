"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import Link from "next/link"
import Image from "next/image"
import { Bell, Hash, Lock, Users, Megaphone, CalendarCheck, BellRing, Check, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

interface ChannelPreview {
  channelId: string
  channelName: string
  channelIcon: string | null
  channelType: "PUBLIC" | "PRIVATE" | "TEAM" | "GROUP"
  lastMessage: {
    content: string
    createdAt: string
    authorName: string
    authorAvatar: string | null
  }
  isUnread: boolean
}

interface PendingSlot {
  id: string
  status: string
  role: { name: string }
  serviceTeam: {
    team: { name: string }
    service: { id: string; title: string; date: string }
  }
}

interface Announcement {
  id: string
  title: string
  body: string
  authorName: string
  createdAt: string
}

interface UpcomingEvent {
  id: string
  title: string
  startDate: string
  location: string | null
}

function ChannelIcon({ type }: { type: ChannelPreview["channelType"] }) {
  if (type === "PRIVATE") return <Lock className="h-3.5 w-3.5 shrink-0" />
  if (type === "TEAM") return <Users className="h-3.5 w-3.5 shrink-0" />
  return <Hash className="h-3.5 w-3.5 shrink-0" />
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return "just now"
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

function initials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [counts, setCounts] = useState({ chat: 0, notifications: 0 })
  const [chatPreviews, setChatPreviews] = useState<ChannelPreview[]>([])
  const [pendingSlots, setPendingSlots] = useState<PendingSlot[]>([])
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [upcomingEvents, setUpcomingEvents] = useState<UpcomingEvent[]>([])
  const [loadingSlot, setLoadingSlot] = useState<string | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchCounts = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications/unread")
      if (res.ok) {
        const data = await res.json()
        setCounts(data)
      }
    } catch {
      // silent
    }
  }, [])

  useEffect(() => {
    fetchCounts()
    pollRef.current = setInterval(fetchCounts, 60_000)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [fetchCounts])

  async function loadPanelData() {
    const [chatRes, notifRes] = await Promise.all([
      fetch("/api/notifications/chat"),
      fetch("/api/notifications"),
    ])
    if (chatRes.ok) {
      const data = await chatRes.json()
      setChatPreviews(data.channels)
    }
    if (notifRes.ok) {
      const data = await notifRes.json()
      setPendingSlots(data.pendingSlots)
      setAnnouncements(data.announcements)
      setUpcomingEvents(data.upcomingEvents)
    }
  }

  function handleOpenChange(v: boolean) {
    setOpen(v)
    if (v) loadPanelData()
  }

  async function respondToSlot(slotId: string, status: "ACCEPTED" | "DECLINED") {
    setLoadingSlot(slotId)
    const res = await fetch(`/api/slots/${slotId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    })
    setLoadingSlot(null)
    if (!res.ok) { toast.error("Failed to respond"); return }
    setPendingSlots((prev) => prev.filter((s) => s.id !== slotId))
    setCounts((prev) => ({ ...prev, notifications: Math.max(0, prev.notifications - 1) }))
    toast.success(status === "ACCEPTED" ? "Accepted!" : "Declined")
  }

  const totalBadge = counts.chat + counts.notifications

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          className="relative flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          aria-label="Notifications"
        >
          <Bell className="h-4.5 w-4.5" />
          {totalBadge > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white leading-none">
              {totalBadge > 99 ? "99+" : totalBadge}
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[360px] p-0 shadow-lg"
      >
        <Tabs defaultValue="chat">
          <div className="flex items-center justify-between border-b px-3 pt-3 pb-0">
            <p className="text-sm font-semibold">Inbox</p>
            <TabsList className="h-8 mb-0 bg-transparent gap-0 border-0 p-0">
              <TabsTrigger
                value="chat"
                className="relative h-8 rounded-none border-b-2 border-transparent px-3 text-xs data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
              >
                Chat
                {counts.chat > 0 && (
                  <span className="ml-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white leading-none">
                    {counts.chat}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="notifications"
                className="relative h-8 rounded-none border-b-2 border-transparent px-3 text-xs data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
              >
                Notifications
                {counts.notifications > 0 && (
                  <span className="ml-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white leading-none">
                    {counts.notifications}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>
          </div>

          {/* ── Chat tab ── */}
          <TabsContent value="chat" className="m-0 max-h-[420px] overflow-y-auto">
            {chatPreviews.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
                <Hash className="h-8 w-8 mb-2 opacity-30" />
                <p className="text-sm">No recent messages</p>
              </div>
            ) : (
              <ul className="divide-y">
                {chatPreviews.map((c) => (
                  <li key={c.channelId}>
                    <Link
                      href={`/mychurch/chat/${c.channelId}`}
                      onClick={() => setOpen(false)}
                      className={cn(
                        "flex items-start gap-3 px-4 py-3 hover:bg-accent/50 transition-colors",
                        c.isUnread && "bg-primary/5"
                      )}
                    >
                      {/* Avatar */}
                      <div className="mt-0.5 h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0 text-base">
                        {c.channelIcon ? (
                          <span>{c.channelIcon}</span>
                        ) : c.lastMessage.authorAvatar ? (
                          <Image
                            src={c.lastMessage.authorAvatar}
                            alt={c.lastMessage.authorName}
                            width={32}
                            height={32}
                            className="rounded-full h-8 w-8 object-cover"
                          />
                        ) : (
                          <span className="text-xs font-semibold text-muted-foreground">
                            {initials(c.lastMessage.authorName)}
                          </span>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span className={cn("text-sm truncate", c.isUnread ? "font-semibold" : "font-medium")}>
                            {c.channelIcon ? "" : <ChannelIcon type={c.channelType} />}
                            {" "}{c.channelName}
                          </span>
                          <span className="text-[11px] text-muted-foreground shrink-0">
                            {timeAgo(c.lastMessage.createdAt)}
                          </span>
                        </div>
                        <p className={cn("text-xs truncate mt-0.5", c.isUnread ? "text-foreground" : "text-muted-foreground")}>
                          <span className="font-medium">{c.lastMessage.authorName}: </span>
                          {c.lastMessage.content}
                        </p>
                      </div>

                      {c.isUnread && (
                        <div className="mt-2 h-2 w-2 rounded-full bg-primary shrink-0" />
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <div className="border-t px-4 py-2">
              <Link
                href="/mychurch/chat"
                onClick={() => setOpen(false)}
                className="text-xs text-primary hover:underline"
              >
                Open Chat →
              </Link>
            </div>
          </TabsContent>

          {/* ── Notifications tab ── */}
          <TabsContent value="notifications" className="m-0 max-h-[420px] overflow-y-auto">
            {pendingSlots.length === 0 && announcements.length === 0 && upcomingEvents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
                <Bell className="h-8 w-8 mb-2 opacity-30" />
                <p className="text-sm">You&apos;re all caught up</p>
              </div>
            ) : (
              <div>
                {/* Service requests */}
                {pendingSlots.length > 0 && (
                  <div>
                    <p className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground bg-muted/40 border-b">
                      Service Requests
                    </p>
                    <ul className="divide-y">
                      {pendingSlots.map((s) => (
                        <li key={s.id} className="flex items-start gap-3 px-4 py-3">
                          <BellRing className="h-4 w-4 mt-0.5 shrink-0 text-amber-500" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium leading-tight truncate">
                              {s.serviceTeam.service.title ||
                                new Date(s.serviceTeam.service.date).toLocaleDateString("en-US", {
                                  month: "short", day: "numeric",
                                })}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {s.serviceTeam.team.name} · {s.role.name}
                            </p>
                          </div>
                          <div className="flex gap-1 shrink-0">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2 text-green-600 border-green-200 hover:bg-green-50"
                              disabled={loadingSlot === s.id}
                              onClick={() => respondToSlot(s.id, "ACCEPTED")}
                            >
                              <Check className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2 text-red-600 border-red-200 hover:bg-red-50"
                              disabled={loadingSlot === s.id}
                              onClick={() => respondToSlot(s.id, "DECLINED")}
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Announcements */}
                {announcements.length > 0 && (
                  <div>
                    <p className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground bg-muted/40 border-b border-t">
                      Announcements
                    </p>
                    <ul className="divide-y">
                      {announcements.map((a) => (
                        <li key={a.id} className="flex items-start gap-3 px-4 py-3">
                          <Megaphone className="h-4 w-4 mt-0.5 shrink-0 text-blue-500" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium leading-tight">{a.title}</p>
                            <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{a.body}</p>
                            <p className="text-[11px] text-muted-foreground mt-1">
                              {a.authorName} · {timeAgo(a.createdAt)}
                            </p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Upcoming events */}
                {upcomingEvents.length > 0 && (
                  <div>
                    <p className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground bg-muted/40 border-b border-t">
                      Upcoming Events
                    </p>
                    <ul className="divide-y">
                      {upcomingEvents.map((e) => (
                        <li key={e.id} className="flex items-start gap-3 px-4 py-3">
                          <CalendarCheck className="h-4 w-4 mt-0.5 shrink-0 text-violet-500" />
                          <div className="flex-1 min-w-0">
                            <Link
                              href={`/mychurch/events/${e.id}`}
                              onClick={() => setOpen(false)}
                              className="text-sm font-medium hover:underline"
                            >
                              {e.title}
                            </Link>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {new Date(e.startDate).toLocaleDateString("en-US", {
                                weekday: "short", month: "short", day: "numeric",
                              })}
                              {e.location && ` · ${e.location}`}
                            </p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </PopoverContent>
    </Popover>
  )
}
