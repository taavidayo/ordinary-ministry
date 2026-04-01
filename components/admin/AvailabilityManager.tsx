"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { ChevronLeft, ChevronRight, X, Settings2 } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"

interface Blockout {
  id: string
  date: string
  note: string | null
  allDay: boolean
  startTime: string | null
  endTime: string | null
}

interface SchedulingPrefs {
  planPeriod: "month" | "day"
  maxPlans: number | null
}

interface Props {
  userId: string
}

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
]
const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"]

function pad(n: number) { return String(n).padStart(2, "0") }
function toDateStr(y: number, m: number, d: number) {
  return `${y}-${pad(m + 1)}-${pad(d)}`
}
function formatTime(t: string | null) {
  if (!t) return ""
  const [h, m] = t.split(":").map(Number)
  const period = h >= 12 ? "PM" : "AM"
  const hour = h % 12 || 12
  return `${hour}:${pad(m)} ${period}`
}

function generateRepeatDates(start: string, repeat: string, until: string): string[] {
  const dates: string[] = []
  let current = new Date(start + "T12:00:00")
  const endDate = new Date(until + "T12:00:00")

  while (true) {
    if (repeat === "weekly") {
      current = new Date(current.getTime() + 7 * 24 * 60 * 60 * 1000)
    } else if (repeat === "biweekly") {
      current = new Date(current.getTime() + 14 * 24 * 60 * 60 * 1000)
    } else if (repeat === "monthly") {
      current = new Date(current)
      current.setMonth(current.getMonth() + 1)
    } else break

    if (current > endDate) break
    dates.push(toDateStr(current.getFullYear(), current.getMonth(), current.getDate()))
  }
  return dates
}

export default function AvailabilityManager({ userId }: Props) {
  const today = new Date()
  const todayStr = toDateStr(today.getFullYear(), today.getMonth(), today.getDate())

  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [blockouts, setBlockouts] = useState<Blockout[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  // Blockout dialog state
  const [pendingDate, setPendingDate] = useState<string | null>(null)
  const [pendingNote, setPendingNote] = useState("")
  const [pendingAllDay, setPendingAllDay] = useState(true)
  const [pendingStartTime, setPendingStartTime] = useState("09:00")
  const [pendingEndTime, setPendingEndTime] = useState("17:00")
  const [pendingRepeat, setPendingRepeat] = useState<"none" | "weekly" | "biweekly" | "monthly">("none")
  const [pendingRepeatUntil, setPendingRepeatUntil] = useState("")

  // Preferences state
  const [prefsOpen, setPrefsOpen] = useState(false)
  const [prefs, setPrefs] = useState<SchedulingPrefs>({ planPeriod: "month", maxPlans: null })
  const [prefsSaveStatus, setPrefsSaveStatus] = useState<"idle" | "saving" | "saved">("idle")
  const isMountRef = useRef(true)

  const fetchBlockouts = useCallback(async (y: number, m: number) => {
    setLoading(true)
    const from = toDateStr(y, m, 1)
    const lastDay = new Date(y, m + 1, 0).getDate()
    const to = toDateStr(y, m, lastDay)
    const res = await fetch(`/api/availability?from=${from}&to=${to}`)
    if (res.ok) {
      const data: Blockout[] = await res.json()
      setBlockouts(data.map((b) => ({ ...b, date: b.date.slice(0, 10) })))
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchBlockouts(year, month) }, [year, month, fetchBlockouts])

  // Load preferences on mount
  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((data) => {
        if (data.schedulingPreferences) setPrefs(data.schedulingPreferences as SchedulingPrefs)
      })
      .catch(() => {})
  }, [])

  const blockedSet = new Set(blockouts.map((b) => b.date))
  const blockedById = Object.fromEntries(blockouts.map((b) => [b.date, b]))

  function prevMonth() {
    if (month === 0) { setYear((y) => y - 1); setMonth(11) }
    else setMonth((m) => m - 1)
  }
  function nextMonth() {
    if (month === 11) { setYear((y) => y + 1); setMonth(0) }
    else setMonth((m) => m + 1)
  }

  async function toggleDay(dateStr: string) {
    if (dateStr < todayStr) return
    if (blockedSet.has(dateStr)) {
      const record = blockedById[dateStr]
      if (!record) return
      const res = await fetch(`/api/availability/${record.id}`, { method: "DELETE" })
      if (!res.ok) { toast.error("Failed to remove blockout"); return }
      setBlockouts((prev) => prev.filter((b) => b.id !== record.id))
      toast.success("Blockout removed")
    } else {
      setPendingDate(dateStr)
      setPendingNote("")
      setPendingAllDay(true)
      setPendingStartTime("09:00")
      setPendingEndTime("17:00")
      setPendingRepeat("none")
      setPendingRepeatUntil("")
    }
  }

  async function saveOneBlockout(dateStr: string) {
    const res = await fetch("/api/availability", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        date: dateStr,
        note: pendingNote || null,
        allDay: pendingAllDay,
        startTime: pendingAllDay ? null : pendingStartTime,
        endTime: pendingAllDay ? null : pendingEndTime,
      }),
    })
    if (!res.ok) throw new Error("Failed")
    const created: Blockout = await res.json()
    return { ...created, date: created.date.slice(0, 10) }
  }

  async function confirmBlockout() {
    if (!pendingDate) return
    setSaving(true)
    try {
      const first = await saveOneBlockout(pendingDate)
      const newBlockouts: Blockout[] = []

      // Only add to this month's view if it falls in current month
      const [fy, fm] = pendingDate.split("-").map(Number)
      if (fy === year && fm - 1 === month) newBlockouts.push(first)

      if (pendingRepeat !== "none" && pendingRepeatUntil) {
        const repeatDates = generateRepeatDates(pendingDate, pendingRepeat, pendingRepeatUntil)
        for (const d of repeatDates) {
          try {
            const r = await saveOneBlockout(d)
            const [ry, rm] = d.split("-").map(Number)
            if (ry === year && rm - 1 === month) newBlockouts.push(r)
          } catch {}
        }
      }

      setBlockouts((prev) => {
        const existingIds = new Set(prev.map((b) => b.id))
        return [...prev, ...newBlockouts.filter((b) => !existingIds.has(b.id))]
      })
      setPendingDate(null)

      const totalCreated = pendingRepeat !== "none" && pendingRepeatUntil
        ? 1 + generateRepeatDates(pendingDate, pendingRepeat, pendingRepeatUntil).length
        : 1
      toast.success(totalCreated > 1 ? `${totalCreated} dates blocked out` : "Date blocked out")
    } catch {
      toast.error("Failed to save blockout")
    }
    setSaving(false)
  }

  // Auto-save preferences with 800ms debounce; skip initial mount
  useEffect(() => {
    if (isMountRef.current) {
      isMountRef.current = false
      return
    }
    setPrefsSaveStatus("saving")
    const timer = setTimeout(async () => {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schedulingPreferences: prefs }),
      })
      if (res.ok) {
        setPrefsSaveStatus("saved")
        setTimeout(() => setPrefsSaveStatus("idle"), 2000)
      } else {
        setPrefsSaveStatus("idle")
        toast.error("Failed to save preferences")
      }
    }, 800)
    return () => clearTimeout(timer)
  }, [prefs])

  // Build weeks
  const firstDow = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: Array<{ day: number; dateStr: string } | null> = []
  for (let i = 0; i < firstDow; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d, dateStr: toDateStr(year, month, d) })
  while (cells.length % 7 !== 0) cells.push(null)
  const weeks: Array<typeof cells> = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))

  return (
    <div className={loading ? "opacity-60 pointer-events-none" : ""}>
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={prevMonth}
          className="p-1.5 rounded-md hover:bg-accent text-muted-foreground transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="font-semibold text-sm">{MONTHS[month]} {year}</span>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => setPrefsOpen(true)}
            className="p-1.5 rounded-md hover:bg-accent text-muted-foreground transition-colors"
            title="Scheduling preferences"
          >
            <Settings2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={nextMonth}
            className="p-1.5 rounded-md hover:bg-accent text-muted-foreground transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Calendar table */}
      <div className="rounded-lg overflow-hidden border border-border bg-card">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-muted/50">
              {DAYS.map((d) => (
                <th
                  key={d}
                  className="border border-border py-1.5 text-center text-[10px] font-semibold text-muted-foreground uppercase tracking-wide"
                >
                  {d}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {weeks.map((week, wi) => (
              <tr key={wi}>
                {week.map((cell, di) => {
                  if (!cell) {
                    return (
                      <td
                        key={di}
                        className="border border-border bg-muted/30"
                        style={{ height: 60 }}
                      />
                    )
                  }

                  const isBlocked = blockedSet.has(cell.dateStr)
                  const isToday = cell.dateStr === todayStr
                  const isPast = cell.dateStr < todayStr
                  const record = blockedById[cell.dateStr]

                  return (
                    <td
                      key={cell.dateStr}
                      className={`border border-border p-0 ${isBlocked ? "bg-red-50 dark:bg-red-950/30" : "bg-card"}`}
                      style={{ height: 60 }}
                    >
                      <button
                        type="button"
                        disabled={isPast}
                        onClick={() => toggleDay(cell.dateStr)}
                        title={
                          record
                            ? (!record.allDay && record.startTime
                                ? `${formatTime(record.startTime)}–${formatTime(record.endTime)}${record.note ? ` · ${record.note}` : ""}`
                                : record.note ?? undefined)
                            : undefined
                        }
                        className={[
                          "w-full h-full flex flex-col items-center justify-center gap-0.5 transition-colors",
                          isPast
                            ? "cursor-default"
                            : isBlocked
                            ? "hover:bg-red-100 dark:hover:bg-red-900/30 cursor-pointer"
                            : "hover:bg-blue-50/50 cursor-pointer",
                        ].join(" ")}
                      >
                        <span
                          className={[
                            "w-7 h-7 flex items-center justify-center rounded-full text-xs font-medium",
                            isToday
                              ? "bg-blue-500 text-white font-bold"
                              : isBlocked
                              ? "text-red-700 dark:text-red-400 font-semibold"
                              : isPast
                              ? "text-muted-foreground/40"
                              : "text-foreground",
                          ].join(" ")}
                        >
                          {cell.day}
                        </span>
                        {record && !record.allDay && record.startTime && (
                          <span className="text-[9px] text-red-600 dark:text-red-400 leading-none">
                            {formatTime(record.startTime)}
                          </span>
                        )}
                      </button>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Blocked list */}
      {blockouts.length > 0 && (
        <div className="mt-4 border rounded-lg overflow-hidden">
          <div className="px-3 py-2 bg-muted/50 border-b">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
              Blocked this month · {blockouts.length}
            </p>
          </div>
          <div className="divide-y max-h-40 overflow-y-auto">
            {[...blockouts].sort((a, b) => a.date.localeCompare(b.date)).map((b) => (
              <div key={b.id} className="flex items-center justify-between px-3 py-2 text-sm">
                <div className="min-w-0">
                  <span className="font-medium">
                    {new Date(b.date + "T12:00:00").toLocaleDateString("en-US", {
                      weekday: "short", month: "short", day: "numeric",
                    })}
                  </span>
                  {!b.allDay && b.startTime && (
                    <span className="text-muted-foreground ml-2 text-xs">
                      {formatTime(b.startTime)}–{formatTime(b.endTime)}
                    </span>
                  )}
                  {b.allDay && (
                    <span className="text-muted-foreground ml-2 text-xs">All day</span>
                  )}
                  {b.note && (
                    <span className="text-muted-foreground ml-1 text-xs">· {b.note}</span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    const res = await fetch(`/api/availability/${b.id}`, { method: "DELETE" })
                    if (!res.ok) return
                    setBlockouts((prev) => prev.filter((x) => x.id !== b.id))
                    toast.success("Removed")
                  }}
                  className="p-1 ml-2 shrink-0 text-muted-foreground hover:text-destructive rounded transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add blockout dialog */}
      <Dialog open={!!pendingDate} onOpenChange={(o) => !o && setPendingDate(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Block Out Date</DialogTitle>
          </DialogHeader>
          {pendingDate && (
            <p className="text-sm font-medium -mt-1">
              {new Date(pendingDate + "T12:00:00").toLocaleDateString("en-US", {
                weekday: "long", month: "long", day: "numeric", year: "numeric",
              })}
            </p>
          )}

          <div className="space-y-4">
            {/* All Day toggle */}
            <div className="flex items-center justify-between">
              <Label htmlFor="allday-toggle" className="text-sm">All Day</Label>
              <Switch
                id="allday-toggle"
                checked={pendingAllDay}
                onCheckedChange={setPendingAllDay}
              />
            </div>

            {/* Time range */}
            {!pendingAllDay && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Start time</Label>
                  <Input
                    type="time"
                    value={pendingStartTime}
                    onChange={(e) => setPendingStartTime(e.target.value)}
                    className="text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">End time</Label>
                  <Input
                    type="time"
                    value={pendingEndTime}
                    onChange={(e) => setPendingEndTime(e.target.value)}
                    className="text-sm"
                  />
                </div>
              </div>
            )}

            {/* Repeat */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Repeat</Label>
              <Select
                value={pendingRepeat}
                onValueChange={(v) => setPendingRepeat(v as typeof pendingRepeat)}
              >
                <SelectTrigger className="text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Does not repeat</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="biweekly">Every 2 weeks</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Repeat until */}
            {pendingRepeat !== "none" && (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Repeat until</Label>
                <Input
                  type="date"
                  value={pendingRepeatUntil}
                  min={pendingDate ?? undefined}
                  onChange={(e) => setPendingRepeatUntil(e.target.value)}
                  className="text-sm"
                />
              </div>
            )}

            {/* Note */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Reason (optional)</Label>
              <Textarea
                placeholder="e.g. Vacation, out of town…"
                value={pendingNote}
                onChange={(e) => setPendingNote(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && pendingRepeat === "none") {
                    e.preventDefault()
                    confirmBlockout()
                  }
                }}
                rows={2}
                className="text-sm"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" size="sm" onClick={() => setPendingDate(null)}>
              Cancel
            </Button>
            <Button size="sm" onClick={confirmBlockout} disabled={saving}>
              {saving
                ? "Saving…"
                : pendingRepeat !== "none"
                ? "Block out dates"
                : "Block out"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preferences dialog */}
      <Dialog open={prefsOpen} onOpenChange={setPrefsOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Scheduling Preferences</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground -mt-1">
            Set limits on how often you can be scheduled.
          </p>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-sm">Limit period</Label>
              <Select
                value={prefs.planPeriod}
                onValueChange={(v) => setPrefs((p) => ({ ...p, planPeriod: v as "month" | "day" }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="month">Per month</SelectItem>
                  <SelectItem value="day">Per day</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm">
                Max plans{" "}
                <span className="text-muted-foreground font-normal">
                  ({prefs.planPeriod === "month" ? "per month" : "per day"})
                </span>
              </Label>
              <Select
                value={prefs.maxPlans === null ? "unlimited" : String(prefs.maxPlans)}
                onValueChange={(v) =>
                  setPrefs((p) => ({ ...p, maxPlans: v === "unlimited" ? null : Number(v) }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unlimited">Unlimited</SelectItem>
                  {Array.from({ length: 20 }, (_, i) => i + 1).map((n) => (
                    <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-xs text-muted-foreground">
              {prefsSaveStatus === "saving" && "Saving…"}
              {prefsSaveStatus === "saved" && "Saved"}
            </span>
            <Button variant="outline" size="sm" onClick={() => setPrefsOpen(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
