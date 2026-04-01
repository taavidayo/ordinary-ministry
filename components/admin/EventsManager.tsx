"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import { Plus, ClipboardList, List, CalendarDays, CalendarRange, ChevronLeft, ChevronRight, Filter, MapPin, Clock, Tag, Users, Pencil, FileText, SlidersHorizontal } from "lucide-react"
import LocationSearch from "@/components/admin/LocationSearch"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

interface Event {
  id: string
  title: string
  description: string | null
  startDate: Date
  endDate: Date | null
  location: string | null
  published: boolean
  category: string | null
  rsvpEnabled: boolean
  form: { _count: { responses: number } } | null
}

interface Template { id: string; name: string }

type View = "list" | "month" | "week"

function formatDateTime(d: Date) {
  const date = new Date(d)
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) +
    " " + date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
}

function localDateStr(d: Date | string | null | undefined): string {
  if (!d) return ""
  const dt = new Date(d)
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`
}

function buildDatetime(date: string, time: string) {
  if (!date) return ""
  return time ? `${date}T${time}` : `${date}T00:00`
}

function adjustEnd(
  prevStartDate: string, prevStartTime: string,
  nextStartDate: string, nextStartTime: string,
  currentEndDate: string, currentEndTime: string,
): { endDate: string; endTime: string } | null {
  if (!currentEndDate || !prevStartDate || !nextStartDate) return null
  const prevStart = new Date(`${prevStartDate}T${prevStartTime || "00:00"}`)
  const currentEnd = new Date(`${currentEndDate}T${currentEndTime || "00:00"}`)
  const duration = currentEnd.getTime() - prevStart.getTime()
  if (duration < 0) return null
  const nextStart = new Date(`${nextStartDate}T${nextStartTime || "00:00"}`)
  const newEnd = new Date(nextStart.getTime() + duration)
  return {
    endDate: `${newEnd.getFullYear()}-${String(newEnd.getMonth() + 1).padStart(2, "0")}-${String(newEnd.getDate()).padStart(2, "0")}`,
    endTime: `${String(newEnd.getHours()).padStart(2, "0")}:${String(newEnd.getMinutes()).padStart(2, "0")}`,
  }
}

function dateParts(dt: Date) {
  return {
    date: `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`,
    time: `${String(dt.getHours()).padStart(2, "0")}:${String(dt.getMinutes()).padStart(2, "0")}`,
  }
}

function toDateParts(d: Date | null | undefined) {
  if (!d) return { date: "", time: "" }
  const dt = new Date(d)
  const date = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`
  const time = `${String(dt.getHours()).padStart(2, "0")}:${String(dt.getMinutes()).padStart(2, "0")}`
  return { date, time }
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

const CATEGORY_PALETTE = [
  { bg: "bg-violet-100", text: "text-violet-700", dot: "bg-violet-500" },
  { bg: "bg-blue-100",   text: "text-blue-700",   dot: "bg-blue-500"   },
  { bg: "bg-cyan-100",   text: "text-cyan-700",   dot: "bg-cyan-500"   },
  { bg: "bg-emerald-100",text: "text-emerald-700",dot: "bg-emerald-500" },
  { bg: "bg-amber-100",  text: "text-amber-700",  dot: "bg-amber-500"  },
  { bg: "bg-orange-100", text: "text-orange-700", dot: "bg-orange-500" },
  { bg: "bg-pink-100",   text: "text-pink-700",   dot: "bg-pink-500"   },
  { bg: "bg-rose-100",   text: "text-rose-700",   dot: "bg-rose-500"   },
]

function hashCategory(cat: string) {
  let h = 0
  for (let i = 0; i < cat.length; i++) h = (h * 31 + cat.charCodeAt(i)) >>> 0
  return CATEGORY_PALETTE[h % CATEGORY_PALETTE.length]
}

function CategoryBadge({ category }: { category: string | null }) {
  if (!category) return <span className="text-xs text-muted-foreground">—</span>
  const c = hashCategory(category)
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${c.bg} ${c.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} />
      {category}
    </span>
  )
}

const ALL_COLUMNS = [
  { key: "title",    label: "Title"    },
  { key: "start",    label: "Start"    },
  { key: "end",      label: "End"      },
  { key: "location", label: "Location" },
  { key: "status",   label: "Status"   },
  { key: "signups",  label: "Sign-Up"  },
] as const

type ColKey = typeof ALL_COLUMNS[number]["key"]

// ─── EventCard (used inside calendar cells) ───────────────────────────────────

function EventCard({
  ev, onClick, onDragStart,
}: {
  ev: Event
  onClick: () => void
  onDragStart?: (e: React.DragEvent) => void
}) {
  return (
    <div
      draggable={!!onDragStart}
      onDragStart={onDragStart}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onClick()}
      className={`w-full text-left rounded p-1.5 bg-background border border-border hover:bg-muted/50 transition-colors select-none ${onDragStart ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"}`}
    >
      <p className="text-xs font-medium leading-tight line-clamp-2">{ev.title}</p>
      <div className="flex items-center gap-1 mt-0.5 flex-wrap">
        {ev.category && (() => { const c = hashCategory(ev.category!); return (
          <span className={`inline-flex items-center gap-0.5 rounded-sm px-1 text-[10px] font-medium ${c.bg} ${c.text}`}>
            <span className={`h-1 w-1 rounded-full ${c.dot}`} />{ev.category}
          </span>
        ) })()}
        <span className={`text-[10px] ${ev.published ? "text-green-600" : "text-gray-400"}`}>
          {ev.published ? "Published" : "Draft"}
        </span>
      </div>
    </div>
  )
}

// ─── Month View ────────────────────────────────────────────────────────────────

function MonthView({
  events,
  onEventClick,
  onEventDrop,
  current,
}: {
  events: Event[]
  onEventClick: (ev: Event) => void
  onEventDrop: (eventId: string, newDateStr: string) => void
  current: Date
}) {
  const [dragOverDate, setDragOverDate] = useState<string | null>(null)
  const year = current.getFullYear()
  const month = current.getMonth()
  const today = localDateStr(new Date())

  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startOffset = firstDay.getDay()

  const days: Date[] = []
  for (let i = startOffset; i > 0; i--) {
    days.push(new Date(year, month, 1 - i))
  }
  for (let d = 1; d <= lastDay.getDate(); d++) {
    days.push(new Date(year, month, d))
  }
  let extra = 1
  while (days.length % 7 !== 0) {
    days.push(new Date(year, month + 1, extra++))
  }

  const eventsMap = new Map<string, Event[]>()
  for (const ev of events) {
    const key = localDateStr(ev.startDate)
    if (!eventsMap.has(key)) eventsMap.set(key, [])
    eventsMap.get(key)!.push(ev)
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="grid grid-cols-7 bg-muted/50 border-b">
        {DAY_NAMES.map((d) => (
          <div key={d} className="py-2 text-center text-xs font-medium text-muted-foreground">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day, i) => {
          const isCurrentMonth = day.getMonth() === month
          const dayKey = localDateStr(day)
          const isToday = dayKey === today
          const dayEvents = eventsMap.get(dayKey) ?? []
          const isLastRow = i >= days.length - 7

          return (
            <div
              key={i}
              onDragOver={(e) => { e.preventDefault(); setDragOverDate(dayKey) }}
              onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOverDate(null) }}
              onDrop={(e) => {
                e.preventDefault()
                setDragOverDate(null)
                const id = e.dataTransfer.getData("text/plain")
                if (id) onEventDrop(id, dayKey)
              }}
              className={`min-h-[100px] p-1 border-r border-b transition-colors ${i % 7 === 6 ? "border-r-0" : ""} ${isLastRow ? "border-b-0" : ""} ${!isCurrentMonth ? "bg-muted/20" : ""} ${dragOverDate === dayKey ? "bg-primary/10 ring-1 ring-inset ring-primary/40" : ""}`}
            >
              <div
                className={`text-xs font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full ${
                  isToday
                    ? "bg-primary text-primary-foreground"
                    : !isCurrentMonth
                    ? "text-muted-foreground/40"
                    : "text-foreground"
                }`}
              >
                {day.getDate()}
              </div>
              <div className="space-y-0.5">
                {dayEvents.map((ev) => (
                  <EventCard
                    key={ev.id}
                    ev={ev}
                    onClick={() => onEventClick(ev)}
                    onDragStart={(e) => { e.dataTransfer.setData("text/plain", ev.id); e.dataTransfer.effectAllowed = "move" }}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Week View ─────────────────────────────────────────────────────────────────

function WeekView({
  events,
  onEventClick,
  onEventDrop,
  current,
}: {
  events: Event[]
  onEventClick: (ev: Event) => void
  onEventDrop: (eventId: string, newDateStr: string) => void
  current: Date
}) {
  const [dragOverDate, setDragOverDate] = useState<string | null>(null)
  const today = localDateStr(new Date())

  const weekStart = new Date(current)
  weekStart.setDate(current.getDate() - current.getDay())

  const days: Date[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart)
    d.setDate(weekStart.getDate() + i)
    days.push(d)
  }

  const eventsMap = new Map<string, Event[]>()
  for (const ev of events) {
    const key = localDateStr(ev.startDate)
    if (!eventsMap.has(key)) eventsMap.set(key, [])
    eventsMap.get(key)!.push(ev)
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="grid grid-cols-7 bg-muted/50 border-b divide-x">
        {days.map((day, i) => {
          const dayKey = localDateStr(day)
          const isToday = dayKey === today
          return (
            <div key={i} className="py-2 px-1 text-center">
              <p className="text-xs text-muted-foreground">{DAY_NAMES[i]}</p>
              <div
                className={`text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full mx-auto ${
                  isToday ? "bg-primary text-primary-foreground" : ""
                }`}
              >
                {day.getDate()}
              </div>
            </div>
          )
        })}
      </div>
      <div className="grid grid-cols-7 divide-x min-h-[200px]">
        {days.map((day, i) => {
          const dayKey = localDateStr(day)
          const dayEvents = eventsMap.get(dayKey) ?? []
          return (
            <div
              key={i}
              onDragOver={(e) => { e.preventDefault(); setDragOverDate(dayKey) }}
              onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOverDate(null) }}
              onDrop={(e) => {
                e.preventDefault()
                setDragOverDate(null)
                const id = e.dataTransfer.getData("text/plain")
                if (id) onEventDrop(id, dayKey)
              }}
              className={`p-1 space-y-1 transition-colors ${dragOverDate === dayKey ? "bg-primary/10" : ""}`}
            >
              {dayEvents.map((ev) => (
                <EventCard
                  key={ev.id}
                  ev={ev}
                  onClick={() => onEventClick(ev)}
                  onDragStart={(e) => { e.dataTransfer.setData("text/plain", ev.id); e.dataTransfer.effectAllowed = "move" }}
                />
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Calendar Navigation Header ────────────────────────────────────────────────

function CalendarNav({
  view,
  current,
  onChange,
}: {
  view: View
  current: Date
  onChange: (d: Date) => void
}) {
  function prev() {
    if (view === "month") {
      onChange(new Date(current.getFullYear(), current.getMonth() - 1, 1))
    } else {
      const d = new Date(current)
      d.setDate(d.getDate() - 7)
      onChange(d)
    }
  }

  function next() {
    if (view === "month") {
      onChange(new Date(current.getFullYear(), current.getMonth() + 1, 1))
    } else {
      const d = new Date(current)
      d.setDate(d.getDate() + 7)
      onChange(d)
    }
  }

  function title() {
    if (view === "month") {
      return current.toLocaleDateString(undefined, { month: "long", year: "numeric" })
    }
    const start = new Date(current)
    start.setDate(current.getDate() - current.getDay())
    const end = new Date(start)
    end.setDate(start.getDate() + 6)
    const fmt = (d: Date) => d.toLocaleDateString(undefined, { month: "short", day: "numeric" })
    return `${fmt(start)} – ${fmt(end)}, ${end.getFullYear()}`
  }

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" onClick={prev}>
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <span className="text-sm font-medium min-w-[160px] text-center">{title()}</span>
      <Button variant="outline" size="sm" onClick={next}>
        <ChevronRight className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="sm" onClick={() => onChange(new Date())}>
        Today
      </Button>
    </div>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function EventsManager({
  events: init,
  templates = [],
  userRole = "MEMBER",
}: {
  events: Event[]
  templates?: Template[]
  userRole?: string
}) {
  const router = useRouter()
  const [events, setEvents] = useState(init)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [view, setView] = useState<View>("list")
  const [currentDate, setCurrentDate] = useState(new Date())
  const [categoryFilters, setCategoryFilters] = useState<Set<string>>(new Set())

  const categories = Array.from(new Set(events.map((e) => e.category).filter(Boolean))) as string[]
  const visibleEvents = categoryFilters.size > 0
    ? events.filter((e) => e.category && categoryFilters.has(e.category))
    : events

  function toggleCategoryFilter(cat: string) {
    setCategoryFilters((prev) => {
      const next = new Set(prev)
      next.has(cat) ? next.delete(cat) : next.add(cat)
      return next
    })
  }

  const [eventForm, setEventForm] = useState({
    title: "", description: "", startDate: "", startTime: "",
    endDate: "", endTime: "", location: "", published: false, category: "",
  })

  const [withForm, setWithForm] = useState(false)
  const [withRsvp, setWithRsvp] = useState(false)
  const [signupForm, setSignupForm] = useState({ title: "", templateId: "" })

  const canEdit = userRole === "ADMIN" || userRole === "LEADER"

  // View dialog (all users)
  const [viewEvent, setViewEvent] = useState<Event | null>(null)
  const [rsvpName, setRsvpName] = useState("")
  const [rsvpEmail, setRsvpEmail] = useState("")
  const [rsvpDone, setRsvpDone] = useState(false)
  const [rsvpSending, setRsvpSending] = useState(false)

  async function submitRsvp() {
    if (!viewEvent || !rsvpName.trim()) return
    setRsvpSending(true)
    const res = await fetch(`/api/events/${viewEvent.id}/rsvp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: rsvpName, email: rsvpEmail || null }),
    })
    setRsvpSending(false)
    if (res.ok) { setRsvpDone(true); toast.success("You're on the list!") }
    else toast.error("Could not save RSVP")
  }

  const [visibleCols, setVisibleCols] = useState<Set<ColKey>>(
    new Set(["title", "start", "end", "location", "status", "signups"])
  )

  function toggleCol(key: ColKey) {
    setVisibleCols((prev) => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  async function handleEventDrop(eventId: string, newDateStr: string) {
    const ev = events.find((e) => e.id === eventId)
    if (!ev) return

    const oldStart = new Date(ev.startDate)
    const { time: oldStartTime } = dateParts(oldStart)
    const newStartDatetime = `${newDateStr}T${oldStartTime}`

    let newEndDatetime: string | null = null
    if (ev.endDate) {
      const duration = new Date(ev.endDate).getTime() - oldStart.getTime()
      const newEnd = new Date(new Date(newStartDatetime).getTime() + duration)
      const { date, time } = dateParts(newEnd)
      newEndDatetime = `${date}T${time}`
    }

    const res = await fetch(`/api/events/${eventId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        startDate: newStartDatetime,
        endDate: newEndDatetime,
      }),
    })
    if (!res.ok) { toast.error("Failed to move event"); return }
    const updated = await res.json()
    setEvents((prev) => prev.map((e) => e.id === eventId ? { ...e, ...updated } : e))
  }

  async function createEvent() {
    if (!eventForm.title || !eventForm.startDate || !eventForm.category) {
      toast.error("Title, category, and start date are required")
      return
    }
    setSaving(true)

    const startDateTime = buildDatetime(eventForm.startDate, eventForm.startTime)
    const endDateTime = eventForm.endDate ? buildDatetime(eventForm.endDate, eventForm.endTime) : ""

    const res = await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: eventForm.title,
        description: eventForm.description || null,
        startDate: startDateTime,
        endDate: endDateTime || null,
        location: eventForm.location || null,
        published: eventForm.published,
        category: eventForm.category || null,
      rsvpEnabled: withRsvp,
      }),
    })

    if (!res.ok) {
      setSaving(false)
      const err = await res.json().catch(() => ({}))
      toast.error(err?.error ?? `Failed to create event (${res.status})`)
      return
    }

    const event = await res.json()

    if (withForm) {
      await fetch("/api/forms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: signupForm.title || `${eventForm.title} Sign-Up`,
          eventId: event.id,
          templateId: signupForm.templateId || null,
        }),
      })
    }

    setSaving(false)
    toast.success("Event created")
    setOpen(false)
    router.push(`/mychurch/events/${event.id}`)
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold">Events</h1>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Form Templates */}
          <Link href="/mychurch/form-templates">
            <Button variant="outline" size="sm" className="h-9 gap-1.5">
              <FileText className="h-4 w-4" />
              Form Templates
            </Button>
          </Link>

          {/* Category filter */}
          {categories.length > 0 && (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 gap-1.5">
                  <Filter className="h-4 w-4" />
                  Filter
                  {categoryFilters.size > 0 && (
                    <span className="ml-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold w-4 h-4 flex items-center justify-center">
                      {categoryFilters.size}
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-52 p-2">
                <div className="space-y-1">
                  {categories.map((cat) => (
                    <label key={cat} className="flex items-center gap-2 rounded px-2 py-1.5 hover:bg-muted cursor-pointer text-sm">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-gray-300"
                        checked={categoryFilters.has(cat)}
                        onChange={() => toggleCategoryFilter(cat)}
                      />
                      {cat}
                    </label>
                  ))}
                  {categoryFilters.size > 0 && (
                    <button
                      onClick={() => setCategoryFilters(new Set())}
                      className="w-full mt-1 text-xs text-muted-foreground hover:text-foreground text-center pt-1 border-t"
                    >
                      Clear filters
                    </button>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          )}
          {/* Column visibility */}
          {view === "list" && (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 gap-1.5">
                  <SlidersHorizontal className="h-4 w-4" />
                  Columns
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-44 p-2">
                <div className="space-y-1">
                  {ALL_COLUMNS.map(({ key, label }) => (
                    <label key={key} className="flex items-center gap-2 rounded px-2 py-1.5 hover:bg-muted cursor-pointer text-sm">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-gray-300"
                        checked={visibleCols.has(key)}
                        onChange={() => toggleCol(key)}
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          )}

          {/* View toggle */}
          <div className="flex items-center rounded-lg border p-0.5 gap-0.5">
            <Button
              variant={view === "list" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 px-2"
              onClick={() => setView("list")}
            >
              <List className="h-4 w-4 mr-1" /> List
            </Button>
            <Button
              variant={view === "month" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 px-2"
              onClick={() => setView("month")}
            >
              <CalendarDays className="h-4 w-4 mr-1" /> Month
            </Button>
            <Button
              variant={view === "week" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 px-2"
              onClick={() => setView("week")}
            >
              <CalendarRange className="h-4 w-4 mr-1" /> Week
            </Button>
          </div>

          {/* New Event dialog */}
          <Dialog open={open} onOpenChange={(v) => {
            setOpen(v)
            if (!v) {
              setEventForm({ title: "", description: "", startDate: "", startTime: "", endDate: "", endTime: "", location: "", published: false, category: "" })
              setWithRsvp(false)
              setWithForm(false)
              setSignupForm({ title: "", templateId: "" })
            }
          }}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-1" /> New Event</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>New Event</DialogTitle></DialogHeader>
              <div className="space-y-3 pt-2">
                <div className="space-y-1">
                  <Label>Title *</Label>
                  <Input
                    value={eventForm.title}
                    onChange={(e) => { const v = e.target.value; setEventForm((prev) => ({ ...prev, title: v })) }}
                  />
                </div>

                <div className="space-y-1">
                  <Label>Category *</Label>
                  <Input
                    list="event-category-options"
                    placeholder="e.g. Sunday Service, Youth, Community"
                    value={eventForm.category}
                    onChange={(e) => { const v = e.target.value; setEventForm((prev) => ({ ...prev, category: v })) }}
                  />
                  {categories.length > 0 && (
                    <datalist id="event-category-options">
                      {categories.map((c) => <option key={c} value={c} />)}
                    </datalist>
                  )}
                </div>

                <div className="space-y-1">
                  <Label>Description</Label>
                  <Textarea
                    rows={2}
                    value={eventForm.description}
                    onChange={(e) => { const v = e.target.value; setEventForm((prev) => ({ ...prev, description: v })) }}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label>Start Date *</Label>
                    <Input
                      type="date"
                      value={eventForm.startDate}
                      onChange={(e) => {
                        const newVal = e.target.value
                        setEventForm((prev) => {
                          const adj = adjustEnd(prev.startDate, prev.startTime, newVal, prev.startTime, prev.endDate, prev.endTime)
                          return { ...prev, startDate: newVal, ...(adj ?? {}) }
                        })
                      }}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Start Time</Label>
                    <Input
                      type="time"
                      value={eventForm.startTime}
                      onChange={(e) => {
                        const newVal = e.target.value
                        setEventForm((prev) => {
                          const adj = adjustEnd(prev.startDate, prev.startTime, prev.startDate, newVal, prev.endDate, prev.endTime)
                          return { ...prev, startTime: newVal, ...(adj ?? {}) }
                        })
                      }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label>End Date</Label>
                    <Input
                      type="date"
                      value={eventForm.endDate}
                      onChange={(e) => { const v = e.target.value; setEventForm((prev) => ({ ...prev, endDate: v })) }}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>End Time</Label>
                    <Input
                      type="time"
                      value={eventForm.endTime}
                      onChange={(e) => { const v = e.target.value; setEventForm((prev) => ({ ...prev, endTime: v })) }}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label>Location</Label>
                  <LocationSearch
                    value={eventForm.location}
                    onChange={(v) => setEventForm((prev) => ({ ...prev, location: v }))}
                  />
                </div>

                {/* Published toggle */}
                <div className="flex items-center justify-between rounded-lg border px-3 py-2">
                  <div>
                    <p className="text-sm font-medium">
                      {eventForm.published ? "Published" : "Unpublished"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {eventForm.published
                        ? "Visible on the website and dashboard"
                        : "Hidden from the website and dashboard"}
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={eventForm.published}
                    onClick={() => setEventForm((prev) => ({ ...prev, published: !prev.published }))}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                      eventForm.published ? "bg-primary" : "bg-border"
                    }`}
                  >
                    <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-card shadow transform transition-transform ${
                      eventForm.published ? "translate-x-5" : "translate-x-0"
                    }`} />
                  </button>
                </div>

                <Separator />

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={withRsvp}
                    onChange={(e) => { setWithRsvp(e.target.checked); if (e.target.checked) setWithForm(false) }}
                    className="rounded"
                  />
                  <span className="text-sm font-medium">Enable "I'll be there!" RSVP</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={withForm}
                    onChange={(e) => { setWithForm(e.target.checked); if (e.target.checked) setWithRsvp(false) }}
                    className="rounded"
                  />
                  <span className="text-sm font-medium">Create a sign-up form for this event</span>
                </label>

                {withForm && (
                  <div className="pl-5 space-y-2 border-l-2 border-muted">
                    <div className="space-y-1">
                      <Label>Form title</Label>
                      <Input
                        placeholder={`${eventForm.title || "Event"} Sign-Up`}
                        value={signupForm.title}
                        onChange={(e) => setSignupForm({ ...signupForm, title: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Start from template (optional)</Label>
                      <Select
                        value={signupForm.templateId || "none"}
                        onValueChange={(v) => setSignupForm({ ...signupForm, templateId: v === "none" ? "" : v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Blank form" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Blank form</SelectItem>
                          {templates.map((t) => (
                            <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                <Button
                  onClick={createEvent}
                  disabled={saving}
                  className="w-full"
                >
                  {saving ? "Creating…" : withForm ? "Create Event & Form" : "Create Event"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Calendar nav (month/week only) */}
      {(view === "month" || view === "week") && (
        <CalendarNav view={view} current={currentDate} onChange={setCurrentDate} />
      )}

      {/* List view */}
      {view === "list" && (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  {visibleCols.has("title")    && <TableHead>Title</TableHead>}
                  {visibleCols.has("start")    && <TableHead>Start</TableHead>}
                  {visibleCols.has("end")      && <TableHead>End</TableHead>}
                  {visibleCols.has("location") && <TableHead>Location</TableHead>}
                  {visibleCols.has("status")   && <TableHead>Status</TableHead>}
                  {visibleCols.has("signups")  && <TableHead>Sign-Up</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleEvents.map((ev) => (
                  <TableRow key={ev.id} className="cursor-pointer hover:bg-muted/50" onClick={() => { setViewEvent(ev); setRsvpDone(false); setRsvpName(""); setRsvpEmail("") }}>
                    <TableCell><CategoryBadge category={ev.category} /></TableCell>
                    {visibleCols.has("title")    && <TableCell className="font-medium">{ev.title}</TableCell>}
                    {visibleCols.has("start")    && <TableCell className="text-sm">{formatDateTime(ev.startDate)}</TableCell>}
                    {visibleCols.has("end")      && <TableCell className="text-sm text-muted-foreground">{ev.endDate ? formatDateTime(ev.endDate) : "—"}</TableCell>}
                    {visibleCols.has("location") && <TableCell className="text-sm text-muted-foreground max-w-[160px] truncate">{ev.location ?? "—"}</TableCell>}
                    {visibleCols.has("status")   && (
                      <TableCell>
                        {ev.published
                          ? <Badge className="text-xs bg-green-100 text-green-700 hover:bg-green-100">Published</Badge>
                          : <Badge variant="secondary" className="text-xs bg-muted text-gray-500 hover:bg-accent">Draft</Badge>}
                      </TableCell>
                    )}
                    {visibleCols.has("signups") && (
                      <TableCell>
                        {ev.form
                          ? <Badge variant="secondary" className="gap-1 text-xs"><ClipboardList className="h-3 w-3" />{ev.form._count.responses}</Badge>
                          : <span className="text-xs text-muted-foreground">—</span>}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
                {visibleEvents.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">No events yet.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Month view */}
      {view === "month" && (
        <MonthView events={visibleEvents} onEventClick={(ev) => { setViewEvent(ev); setRsvpDone(false); setRsvpName(""); setRsvpEmail("") }} onEventDrop={handleEventDrop} current={currentDate} />
      )}

      {/* Week view */}
      {view === "week" && (
        <WeekView events={visibleEvents} onEventClick={(ev) => { setViewEvent(ev); setRsvpDone(false); setRsvpName(""); setRsvpEmail("") }} onEventDrop={handleEventDrop} current={currentDate} />
      )}

      {/* View dialog */}
      <Dialog open={!!viewEvent} onOpenChange={(v) => { if (!v) setViewEvent(null) }}>
        <DialogContent className="max-w-md">
          {viewEvent && (() => {
            const ev = viewEvent
            const startDt = new Date(ev.startDate)
            const endDt = ev.endDate ? new Date(ev.endDate) : null
            const dateStr = startDt.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" })
            const timeStr = `${startDt.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}${endDt ? ` – ${endDt.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}` : ""}`
            return (
              <>
                <DialogHeader className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    {ev.category && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium rounded-full bg-muted px-2 py-0.5">
                        <Tag className="h-3 w-3" />{ev.category}
                      </span>
                    )}
                    <span className={`text-xs font-medium rounded-full px-2 py-0.5 ${ev.published ? "bg-green-100 text-green-700" : "bg-muted text-gray-500"}`}>
                      {ev.published ? "Published" : "Draft"}
                    </span>
                  </div>
                  <DialogTitle className="text-xl">{ev.title}</DialogTitle>
                </DialogHeader>

                <div className="space-y-3 pt-1">
                  <div className="space-y-1.5 text-sm">
                    <div className="flex items-start gap-2 text-muted-foreground">
                      <Clock className="h-4 w-4 shrink-0 mt-0.5" />
                      <div>
                        <p>{dateStr}</p>
                        <p>{timeStr}</p>
                      </div>
                    </div>
                    {ev.location && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="h-4 w-4 shrink-0" />
                        <span>{ev.location}</span>
                      </div>
                    )}
                  </div>

                  {ev.description && (
                    <p className="text-sm text-muted-foreground whitespace-pre-line">{ev.description}</p>
                  )}

                  {/* RSVP */}
                  {ev.rsvpEnabled && (
                    <div className="border rounded-lg p-3 space-y-2">
                      <p className="text-sm font-medium flex items-center gap-1.5">
                        <Users className="h-4 w-4" /> I&apos;ll be there!
                      </p>
                      {rsvpDone ? (
                        <p className="text-sm text-green-700 font-medium">You&apos;re on the list!</p>
                      ) : (
                        <div className="space-y-2">
                          <Input
                            placeholder="Your name *"
                            value={rsvpName}
                            onChange={(e) => setRsvpName(e.target.value)}
                          />
                          <Input
                            type="email"
                            placeholder="Email (optional)"
                            value={rsvpEmail}
                            onChange={(e) => setRsvpEmail(e.target.value)}
                          />
                          <Button size="sm" onClick={submitRsvp} disabled={rsvpSending || !rsvpName.trim()} className="w-full">
                            {rsvpSending ? "Saving…" : "I'll be there!"}
                          </Button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Sign-up form */}
                  {ev.form && !ev.rsvpEnabled && (
                    <Link
                      href={`/mychurch/events/${ev.id}`}
                      onClick={() => setViewEvent(null)}
                      className="flex items-center justify-center gap-2 w-full rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
                    >
                      <ClipboardList className="h-4 w-4" /> Sign Up ({ev.form._count.responses} response{ev.form._count.responses !== 1 ? "s" : ""})
                    </Link>
                  )}

                  {/* Edit Event — admins/leaders only */}
                  {canEdit && (
                    <div className="pt-1 border-t">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5"
                        onClick={() => { setViewEvent(null); router.push(`/mychurch/events/${ev.id}`) }}
                      >
                        <Pencil className="h-3.5 w-3.5" /> Edit Event
                      </Button>
                    </div>
                  )}
                </div>
              </>
            )
          })()}
        </DialogContent>
      </Dialog>

    </div>
  )
}
