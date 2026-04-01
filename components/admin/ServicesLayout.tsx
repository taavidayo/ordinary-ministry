"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  ChevronLeft, ChevronRight, CalendarDays, Music, CalendarCheck,
  Check, X, CalendarOff, Plus,
} from "lucide-react"
import CollapsibleServiceGroups from "@/components/admin/CollapsibleServiceGroups"
import AvailabilitySheet from "@/components/admin/AvailabilitySheet"
import NewServiceForm from "@/components/admin/NewServiceForm"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { toast } from "sonner"

interface ServiceRow {
  id: string
  title: string
  date: string
  timesCount: number
  series: { id: string; name: string } | null
  updatedAt: string
  updatedBy: { name: string } | null
  category: { name: string; color: string; minRole: string } | null
}

interface SlotRow {
  id: string
  status: string
  roleName: string
  serviceId: string
  serviceTitle: string
  serviceDate: string
  serviceTimeLabel?: string | null
  serviceTimeStart?: string | null
}

interface Props {
  allServices: ServiceRow[]
  categoryMeta: Record<string, { id: string; color: string; minRole: string }>
  isAdmin: boolean
  todayIso: string
  userId: string
  mySlots?: SlotRow[]
  categories?: { id: string; name: string; color: string }[]
  templates?: { id: string; name: string }[]
  allSeries?: { id: string; name: string }[]
}

function toDateStr(iso: string) {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

function buildGroups(services: ServiceRow[], categoryMeta: Props["categoryMeta"]) {
  const grouped: Record<string, ServiceRow[]> = {}
  for (const s of services) {
    const key = s.category?.name ?? "Uncategorized"
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(s)
  }
  const keys = Object.keys(grouped).sort((a, b) =>
    a === "Uncategorized" ? 1 : b === "Uncategorized" ? -1 : a.localeCompare(b)
  )
  return keys.map((key) => ({ key, meta: categoryMeta[key], services: grouped[key] }))
}

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"]
const WEEKDAYS = ["Su","Mo","Tu","We","Th","Fr","Sa"]

const DOT_COLORS: Record<string, string> = {
  blue: "bg-blue-400", red: "bg-red-400", green: "bg-green-400",
  yellow: "bg-yellow-400", purple: "bg-purple-400", pink: "bg-pink-400",
  orange: "bg-orange-400", gray: "bg-gray-400", indigo: "bg-indigo-400",
  teal: "bg-teal-400", cyan: "bg-cyan-400",
}

type MobileTab = "planner" | "schedule"

export default function ServicesLayout({
  allServices, categoryMeta, isAdmin, todayIso, userId, mySlots = [],
  categories, templates, allSeries,
}: Props) {
  const router = useRouter()
  const [slots, setSlots] = useState<SlotRow[]>(mySlots)
  const [activeTab, setActiveTab] = useState<MobileTab>("planner")
  const [newServiceOpen, setNewServiceOpen] = useState(false)
  const [showPastMobile, setShowPastMobile] = useState(false)

  async function respondToSlot(id: string, status: "ACCEPTED" | "DECLINED") {
    const res = await fetch(`/api/slots/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    })
    if (!res.ok) { toast.error("Failed to update"); return }
    if (status === "DECLINED") {
      setSlots(prev => prev.filter(s => s.id !== id))
    } else {
      setSlots(prev => prev.map(s => s.id === id ? { ...s, status: "ACCEPTED" } : s))
    }
    toast.success(status === "ACCEPTED" ? "Accepted!" : "Declined")
  }

  const todayStr = toDateStr(todayIso)
  const [calMonth, setCalMonth] = useState(() => {
    const d = new Date(); d.setDate(1); return d
  })
  const [selectedPastMonth, setSelectedPastMonth] = useState<string | null>(null)

  const year = calMonth.getFullYear()
  const month = calMonth.getMonth()
  const firstDayOfWeek = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const serviceDateMap = new Map<string, string>()
  for (const s of allServices) {
    const key = toDateStr(s.date)
    if (!serviceDateMap.has(key)) serviceDateMap.set(key, s.category?.color ?? "gray")
  }

  const cells: (number | null)[] = [
    ...Array(firstDayOfWeek).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  const upcomingServices = allServices.filter(s => toDateStr(s.date) >= todayStr)
  const pastServices = allServices.filter(s => toDateStr(s.date) < todayStr)

  const displayedServices = selectedPastMonth
    ? pastServices.filter(s => {
        const d = new Date(s.date)
        return d.getFullYear() === parseInt(selectedPastMonth.slice(0, 4)) &&
               d.getMonth() === parseInt(selectedPastMonth.slice(5, 7)) - 1
      })
    : upcomingServices

  const panelLabel = selectedPastMonth
    ? `${MONTHS[parseInt(selectedPastMonth.slice(5, 7)) - 1]} ${selectedPastMonth.slice(0, 4)}`
    : "Upcoming"

  function handleDayClick(dateStr: string) {
    if (dateStr >= todayStr) return
    const monthKey = dateStr.slice(0, 7)
    setSelectedPastMonth(prev => prev === monthKey ? null : monthKey)
  }

  const hasFab = activeTab === "planner" && categories && categories.length > 0

  return (
    <>
      {/* ── Desktop layout (unchanged) ─────────────────────────────── */}
      <div className="hidden md:flex gap-4 items-start">
        {/* Mini calendar sidebar */}
        <div className="w-56 shrink-0 rounded-xl border bg-card shadow-sm p-3 space-y-2 sticky top-4">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCalMonth(new Date(year, month - 1, 1))}
              className="h-6 w-6 flex items-center justify-center rounded hover:bg-accent transition-colors text-muted-foreground"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <span className="flex-1 text-center text-xs font-semibold">{MONTHS[month].slice(0, 3)} {year}</span>
            <button
              onClick={() => setCalMonth(new Date(year, month + 1, 1))}
              className="h-6 w-6 flex items-center justify-center rounded hover:bg-accent transition-colors text-muted-foreground"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-px">
            {WEEKDAYS.map(d => (
              <div key={d} className="text-[9px] font-semibold text-muted-foreground text-center py-0.5">{d}</div>
            ))}
            {cells.map((dayNum, i) => {
              if (!dayNum) return <div key={`pad-${i}`} />
              const dateStr = `${year}-${String(month + 1).padStart(2,"0")}-${String(dayNum).padStart(2,"0")}`
              const isPast = dateStr < todayStr
              const isToday = dateStr === todayStr
              const color = serviceDateMap.get(dateStr)
              const monthKey = dateStr.slice(0, 7)
              const isSelectedMonth = selectedPastMonth === monthKey
              return (
                <button
                  key={dateStr}
                  onClick={() => handleDayClick(dateStr)}
                  disabled={!isPast || !serviceDateMap.has(dateStr)}
                  className={cn(
                    "relative flex flex-col items-center justify-center h-7 w-full rounded text-[10px] transition-colors leading-none",
                    isToday && "font-bold text-primary",
                    isPast && !isToday ? "text-muted-foreground" : !isToday ? "text-foreground" : "",
                    isSelectedMonth && isPast && "bg-primary/10 text-primary font-semibold",
                    isPast && serviceDateMap.has(dateStr) && !isSelectedMonth && "hover:bg-accent cursor-pointer",
                    (!isPast || !serviceDateMap.has(dateStr)) && "cursor-default"
                  )}
                >
                  <span>{dayNum}</span>
                  {color && <span className={cn("h-1 w-1 rounded-full mt-0.5 shrink-0", DOT_COLORS[color] ?? "bg-gray-400")} />}
                </button>
              )
            })}
          </div>

          {slots.length > 0 && (
            <div className="border-t pt-2 space-y-2">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">My Schedule</p>
              {slots.map(slot => {
                const d = new Date(slot.serviceDate)
                const dateStr = d.toLocaleDateString(undefined, { month: "short", day: "numeric" })
                const isPending = slot.status === "PENDING"
                return (
                  <div key={slot.id} className="space-y-1">
                    <Link
                      href={`/mychurch/services/${slot.serviceId}`}
                      className="block text-[10px] font-medium hover:text-primary transition-colors truncate"
                      title={slot.serviceTitle}
                    >
                      {dateStr} · {slot.serviceTitle || "Service"}
                      {(slot.serviceTimeLabel || slot.serviceTimeStart) && (
                        <span className="text-muted-foreground font-normal"> · {slot.serviceTimeLabel ?? slot.serviceTimeStart}</span>
                      )}
                    </Link>
                    <div className="flex items-center justify-between gap-1">
                      <span className={cn(
                        "text-[9px] px-1.5 py-0.5 rounded-full font-medium",
                        isPending ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                                  : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                      )}>
                        {slot.roleName}
                      </span>
                      {isPending && (
                        <div className="flex gap-0.5">
                          <button
                            onClick={() => respondToSlot(slot.id, "ACCEPTED")}
                            className="h-5 w-5 flex items-center justify-center rounded bg-green-100 hover:bg-green-200 dark:bg-green-900/30 dark:hover:bg-green-900/50 text-green-700 dark:text-green-400 transition-colors"
                            title="Accept"
                          >
                            <Check className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => respondToSlot(slot.id, "DECLINED")}
                            className="h-5 w-5 flex items-center justify-center rounded bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-700 dark:text-red-400 transition-colors"
                            title="Decline"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          <div className="border-t pt-2 space-y-1">
            <AvailabilitySheet userId={userId} trigger={
              <button className="flex items-center gap-2 w-full text-left text-[11px] text-muted-foreground hover:text-foreground px-1 py-1 rounded hover:bg-accent transition-colors">
                <CalendarCheck className="h-3.5 w-3.5 shrink-0" /> My Availability
              </button>
            } />
            <Link
              href="/mychurch/songs"
              className="flex items-center gap-2 text-[11px] text-muted-foreground hover:text-foreground px-1 py-1 rounded hover:bg-accent transition-colors"
            >
              <Music className="h-3.5 w-3.5 shrink-0" /> Song Library
            </Link>
          </div>
        </div>

        {/* Services list */}
        <div className="flex-1 min-w-0 space-y-4">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">{panelLabel}</h2>
            {selectedPastMonth && (
              <button onClick={() => setSelectedPastMonth(null)} className="text-xs text-muted-foreground hover:text-foreground">
                (clear)
              </button>
            )}
          </div>
          {displayedServices.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <CalendarDays className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">
                {selectedPastMonth ? "No services in this month." : "No upcoming services."}
              </p>
            </div>
          ) : (
            <CollapsibleServiceGroups
              groups={buildGroups(displayedServices, categoryMeta)}
              isAdmin={isAdmin}
            />
          )}
        </div>
      </div>

      {/* ── Mobile layout ─────────────────────────────────────────── */}
      <div className="md:hidden">
        {/* Scrollable content area, padded to clear the bottom tab bar */}
        <div className="pb-24 space-y-4">
          {/* Planner tab */}
          {activeTab === "planner" && (
            <>
              {/* Upcoming / Past toggle */}
              <div className="flex gap-1 mb-4">
                <button
                  onClick={() => setShowPastMobile(false)}
                  className={cn(
                    "px-3 py-1 text-sm rounded-md transition-colors",
                    !showPastMobile ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"
                  )}
                >
                  Upcoming
                </button>
                <button
                  onClick={() => setShowPastMobile(true)}
                  className={cn(
                    "px-3 py-1 text-sm rounded-md transition-colors",
                    showPastMobile ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"
                  )}
                >
                  Past
                </button>
              </div>
              {(() => {
                const displayList = showPastMobile
                  ? [...pastServices].sort((a, b) => b.date.localeCompare(a.date))
                  : upcomingServices
                return displayList.length === 0 ? (
                  <div className="text-center py-16 text-muted-foreground">
                    <CalendarDays className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">{showPastMobile ? "No past services." : "No upcoming services."}</p>
                  </div>
                ) : (
                  <CollapsibleServiceGroups
                    groups={buildGroups(displayList, categoryMeta)}
                    isAdmin={isAdmin}
                  />
                )
              })()}
            </>
          )}

          {/* My Schedule tab */}
          {activeTab === "schedule" && (
            slots.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <CalendarCheck className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No upcoming assignments.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {slots.map(slot => {
                  const d = new Date(slot.serviceDate)
                  const dateStr = d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })
                  const isPending = slot.status === "PENDING"
                  return (
                    <div key={slot.id} className="bg-card rounded-lg border p-3 space-y-2">
                      <Link
                        href={`/mychurch/services/${slot.serviceId}`}
                        className="block text-sm font-medium hover:text-primary transition-colors"
                      >
                        {slot.serviceTitle || "Service"}
                      </Link>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs text-muted-foreground">
                            {dateStr}{slot.serviceTimeLabel ? ` · ${slot.serviceTimeLabel}` : slot.serviceTimeStart ? ` · ${slot.serviceTimeStart}` : ""}
                          </span>
                          <span className={cn(
                            "text-xs px-2 py-0.5 rounded-full font-medium",
                            isPending
                              ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                              : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                          )}>
                            {slot.roleName}
                          </span>
                        </div>
                        {isPending && (
                          <div className="flex gap-1 shrink-0">
                            <button
                              onClick={() => respondToSlot(slot.id, "ACCEPTED")}
                              className="h-7 w-7 flex items-center justify-center rounded-md bg-green-100 hover:bg-green-200 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                              title="Accept"
                            >
                              <Check className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => respondToSlot(slot.id, "DECLINED")}
                              className="h-7 w-7 flex items-center justify-center rounded-md bg-red-100 hover:bg-red-200 dark:bg-red-900/30 text-red-700 dark:text-red-400"
                              title="Decline"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          )}
        </div>

        {/* FAB: new service (planner tab only) */}
        {hasFab && (
          <button
            onClick={() => setNewServiceOpen(true)}
            className="fixed bottom-20 right-4 z-20 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center"
            aria-label="New service"
          >
            <Plus className="h-6 w-6" />
          </button>
        )}

        {/* Bottom tab bar */}
        <div className="fixed bottom-0 left-0 right-0 z-30 bg-card border-t flex h-16">
          <button
            onClick={() => setActiveTab("schedule")}
            className={cn(
              "flex-1 flex flex-col items-center justify-center gap-1 text-xs transition-colors",
              activeTab === "schedule" ? "text-primary" : "text-muted-foreground"
            )}
          >
            <CalendarCheck className="h-5 w-5" />
            My Schedule
          </button>
          <button
            onClick={() => setActiveTab("planner")}
            className={cn(
              "flex-1 flex flex-col items-center justify-center gap-1 text-xs transition-colors",
              activeTab === "planner" ? "text-primary" : "text-muted-foreground"
            )}
          >
            <CalendarDays className="h-5 w-5" />
            Planner
          </button>
          <Link
            href="/mychurch/songs"
            className="flex-1 flex flex-col items-center justify-center gap-1 text-xs text-muted-foreground"
          >
            <Music className="h-5 w-5" />
            Songs
          </Link>
          <Link
            href="/mychurch/availability"
            className="flex-1 flex flex-col items-center justify-center gap-1 text-xs text-muted-foreground"
          >
            <CalendarOff className="h-5 w-5" />
            Availability
          </Link>
        </div>

        {/* New service dialog (mobile FAB) */}
        {categories && (
          <Dialog open={newServiceOpen} onOpenChange={setNewServiceOpen}>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>New Service</DialogTitle>
              </DialogHeader>
              <NewServiceForm
                categories={categories}
                templates={templates ?? []}
                allSeries={allSeries ?? []}
                onSuccess={() => { setNewServiceOpen(false); router.refresh() }}
                onClose={() => setNewServiceOpen(false)}
              />
            </DialogContent>
          </Dialog>
        )}

      </div>
    </>
  )
}
