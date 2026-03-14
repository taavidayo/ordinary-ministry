"use client"

import { useState, useMemo } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"

type CalendarEvent = {
  id: string
  title: string
  startDate: string
  endDate: string | null
  location: string | null
  description: string | null
}

type View = "list" | "month" | "week"

const DAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

function getSundayOfWeek(date: Date): Date {
  const d = new Date(date)
  d.setDate(d.getDate() - d.getDay())
  d.setHours(0, 0, 0, 0)
  return d
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function isEventOnDay(startDate: string, endDate: string | null, day: Date): boolean {
  const evStart = new Date(startDate)
  evStart.setHours(0, 0, 0, 0)
  const evEnd = endDate ? new Date(endDate) : new Date(startDate)
  evEnd.setHours(23, 59, 59, 999)

  const dayStart = new Date(day)
  dayStart.setHours(0, 0, 0, 0)
  const dayEnd = new Date(day)
  dayEnd.setHours(23, 59, 59, 999)

  return evStart <= dayEnd && evEnd >= dayStart
}

function formatEventDate(startDate: string, endDate: string | null): string {
  const start = new Date(startDate)
  const end = endDate ? new Date(endDate) : null

  const startStr = start.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  })

  if (!end || isSameDay(start, end)) return startStr

  return `${startStr} – ${end.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`
}

export function EventsCalendar({ events }: { events: CalendarEvent[] }) {
  const today = new Date()
  const [view, setView] = useState<View>("list")
  const [monthDate, setMonthDate] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1)
  )
  const [weekStart, setWeekStart] = useState(getSundayOfWeek(today))

  const upcomingEvents = useMemo(
    () =>
      events
        .filter((ev) => {
          const start = new Date(ev.startDate)
          start.setHours(0, 0, 0, 0)
          const todayStart = new Date(today)
          todayStart.setHours(0, 0, 0, 0)
          return start >= todayStart
        })
        .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [events]
  )

  const monthDays = useMemo(() => {
    const year = monthDate.getFullYear()
    const month = monthDate.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startOffset = firstDay.getDay() // 0 = Sunday

    const days: Date[] = []

    // Trailing days from previous month
    for (let i = startOffset - 1; i >= 0; i--) {
      days.push(new Date(year, month, -i))
    }

    // Current month
    for (let d = 1; d <= lastDay.getDate(); d++) {
      days.push(new Date(year, month, d))
    }

    // Leading days from next month to complete last row
    const remaining = 7 - (days.length % 7)
    if (remaining < 7) {
      for (let d = 1; d <= remaining; d++) {
        days.push(new Date(year, month + 1, d))
      }
    }

    return days
  }, [monthDate])

  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  )

  function getEventsForDay(day: Date) {
    return events
      .filter((ev) => isEventOnDay(ev.startDate, ev.endDate, day))
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
  }

  function prevPeriod() {
    if (view === "month") {
      setMonthDate(new Date(monthDate.getFullYear(), monthDate.getMonth() - 1, 1))
    } else {
      setWeekStart(addDays(weekStart, -7))
    }
  }

  function nextPeriod() {
    if (view === "month") {
      setMonthDate(new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1))
    } else {
      setWeekStart(addDays(weekStart, 7))
    }
  }

  function goToToday() {
    setMonthDate(new Date(today.getFullYear(), today.getMonth(), 1))
    setWeekStart(getSundayOfWeek(today))
  }

  const periodLabel =
    view === "month"
      ? monthDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })
      : `${weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${addDays(weekStart, 6).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`

  return (
    <div>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        {/* View switcher */}
        <div className="flex gap-1 bg-muted rounded-lg p-1">
          {(["list", "month", "week"] as View[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium capitalize transition-colors ${
                view === v
                  ? "bg-background shadow text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {v}
            </button>
          ))}
        </div>

        {/* Navigation (month/week only) */}
        {view !== "list" && (
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" onClick={goToToday}>
              Today
            </Button>
            <Button variant="ghost" size="icon" onClick={prevPeriod}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium min-w-[180px] text-center">
              {periodLabel}
            </span>
            <Button variant="ghost" size="icon" onClick={nextPeriod}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* List View */}
      {view === "list" && (
        <div className="space-y-4">
          {upcomingEvents.length === 0 && (
            <p className="text-muted-foreground">No upcoming events.</p>
          )}
          {upcomingEvents.map((ev) => (
            <div key={ev.id} className="border rounded-lg p-5">
              <h2 className="text-xl font-semibold mb-1">{ev.title}</h2>
              <p className="text-sm text-muted-foreground mb-2">
                {formatEventDate(ev.startDate, ev.endDate)}
                {ev.location && ` · ${ev.location}`}
              </p>
              {ev.description && <p className="text-sm">{ev.description}</p>}
            </div>
          ))}
        </div>
      )}

      {/* Month View */}
      {view === "month" && (
        <div className="overflow-x-auto">
          <div className="min-w-[560px]">
            {/* Day-of-week headers */}
            <div className="grid grid-cols-7 border-b">
              {DAYS_SHORT.map((d) => (
                <div
                  key={d}
                  className="text-xs font-medium text-muted-foreground text-center py-2"
                >
                  {d}
                </div>
              ))}
            </div>

            {/* Day cells */}
            <div className="grid grid-cols-7 border-l border-t">
              {monthDays.map((day, i) => {
                const isCurrentMonth = day.getMonth() === monthDate.getMonth()
                const isToday = isSameDay(day, today)
                const dayEvents = getEventsForDay(day)

                return (
                  <div
                    key={i}
                    className={`border-r border-b min-h-[96px] p-1 ${
                      !isCurrentMonth ? "bg-muted/30" : ""
                    }`}
                  >
                    <div
                      className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full mb-1 ${
                        isToday
                          ? "bg-primary text-primary-foreground"
                          : isCurrentMonth
                          ? "text-foreground"
                          : "text-muted-foreground"
                      }`}
                    >
                      {day.getDate()}
                    </div>
                    <div className="space-y-0.5">
                      {dayEvents.slice(0, 3).map((ev) => (
                        <div
                          key={ev.id}
                          className="text-xs bg-primary/10 text-primary rounded px-1 py-0.5 truncate"
                          title={ev.title}
                        >
                          {ev.title}
                        </div>
                      ))}
                      {dayEvents.length > 3 && (
                        <div className="text-xs text-muted-foreground px-1">
                          +{dayEvents.length - 3} more
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Week View */}
      {view === "week" && (
        <div className="overflow-x-auto">
          <div className="min-w-[560px] border-l border-t grid grid-cols-7">
            {weekDays.map((day, i) => {
              const isToday = isSameDay(day, today)
              const dayEvents = getEventsForDay(day)

              return (
                <div key={i} className="border-r border-b">
                  {/* Day header */}
                  <div
                    className={`text-center py-3 border-b ${
                      isToday ? "bg-primary/5" : ""
                    }`}
                  >
                    <div className="text-xs text-muted-foreground">{DAYS_SHORT[i]}</div>
                    <div
                      className={`text-lg font-semibold w-9 h-9 flex items-center justify-center rounded-full mx-auto ${
                        isToday ? "bg-primary text-primary-foreground" : ""
                      }`}
                    >
                      {day.getDate()}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {day.toLocaleDateString("en-US", { month: "short" })}
                    </div>
                  </div>

                  {/* Events */}
                  <div className="p-1 space-y-1 min-h-[160px]">
                    {dayEvents.map((ev) => (
                      <div
                        key={ev.id}
                        className="text-xs bg-primary/10 text-primary rounded p-1.5"
                      >
                        <div className="font-medium leading-tight">{ev.title}</div>
                        {ev.location && (
                          <div className="text-muted-foreground mt-0.5 truncate">
                            {ev.location}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
