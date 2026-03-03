"use client"

import { useState, useEffect, useCallback } from "react"
import { ChevronLeft, ChevronRight, X } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

interface Blockout {
  id: string
  date: string
  note: string | null
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

export default function AvailabilityManager({ userId }: Props) {
  const today = new Date()
  const todayStr = toDateStr(today.getFullYear(), today.getMonth(), today.getDate())

  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [blockouts, setBlockouts] = useState<Blockout[]>([])
  const [loading, setLoading] = useState(false)
  const [pendingDate, setPendingDate] = useState<string | null>(null)
  const [pendingNote, setPendingNote] = useState("")
  const [saving, setSaving] = useState(false)

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
    }
  }

  async function confirmBlockout() {
    if (!pendingDate) return
    setSaving(true)
    const res = await fetch("/api/availability", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, date: pendingDate, note: pendingNote || null }),
    })
    setSaving(false)
    if (!res.ok) { toast.error("Failed to save blockout"); return }
    const created: Blockout = await res.json()
    setBlockouts((prev) => [...prev, { ...created, date: created.date.slice(0, 10) }])
    setPendingDate(null)
    toast.success("Date blocked out")
  }

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
          className="p-1.5 rounded-md hover:bg-gray-100 text-muted-foreground transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="font-semibold text-sm">{MONTHS[month]} {year}</span>
        <button
          type="button"
          onClick={nextMonth}
          className="p-1.5 rounded-md hover:bg-gray-100 text-muted-foreground transition-colors"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Calendar table */}
      <div className="rounded-lg overflow-hidden border border-gray-200">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-50">
              {DAYS.map((d) => (
                <th
                  key={d}
                  className="border border-gray-200 py-1.5 text-center text-[10px] font-semibold text-muted-foreground uppercase tracking-wide"
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
                        className="border border-gray-200 bg-gray-50/40"
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
                      className={`border border-gray-200 p-0 ${isBlocked ? "bg-red-50" : ""}`}
                      style={{ height: 60 }}
                    >
                      <button
                        type="button"
                        disabled={isPast}
                        onClick={() => toggleDay(cell.dateStr)}
                        title={record?.note ?? undefined}
                        className={[
                          "w-full h-full flex items-center justify-center transition-colors",
                          isPast
                            ? "cursor-default"
                            : isBlocked
                            ? "hover:bg-red-100 cursor-pointer"
                            : "hover:bg-blue-50/50 cursor-pointer",
                        ].join(" ")}
                      >
                        <span
                          className={[
                            "w-7 h-7 flex items-center justify-center rounded-full text-xs font-medium",
                            isToday
                              ? "bg-blue-500 text-white font-bold"
                              : isBlocked
                              ? "text-red-700 font-semibold"
                              : isPast
                              ? "text-gray-300"
                              : "text-gray-800",
                          ].join(" ")}
                        >
                          {cell.day}
                        </span>
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
          <div className="px-3 py-2 bg-gray-50 border-b">
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
                  {b.note && (
                    <span className="text-muted-foreground ml-2 text-xs">{b.note}</span>
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
            <p className="text-sm font-medium">
              {new Date(pendingDate + "T12:00:00").toLocaleDateString("en-US", {
                weekday: "long", month: "long", day: "numeric", year: "numeric",
              })}
            </p>
          )}
          <Textarea
            placeholder="Reason (optional)"
            value={pendingNote}
            onChange={(e) => setPendingNote(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); confirmBlockout() }
            }}
            rows={2}
            className="text-sm"
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setPendingDate(null)}>Cancel</Button>
            <Button size="sm" onClick={confirmBlockout} disabled={saving}>
              {saving ? "Saving…" : "Block out"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
