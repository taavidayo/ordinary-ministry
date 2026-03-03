"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CalendarCheck, MapPin } from "lucide-react"
import Link from "next/link"

export interface EventItem {
  id: string
  title: string
  startDate: string
  endDate: string | null
  location: string | null
}

interface Props {
  events: EventItem[]
  timezone: string
}

function formatDateRange(start: string, end: string | null, timezone: string): string {
  const s = new Date(start)
  const dateStr = s.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: timezone })
  if (!end) return dateStr
  const e = new Date(end)
  const sDay = s.toLocaleDateString("en-US", { timeZone: timezone })
  const eDay = e.toLocaleDateString("en-US", { timeZone: timezone })
  if (sDay === eDay) return dateStr
  return `${dateStr} – ${e.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: timezone })}`
}

export default function EventsWidget({ events, timezone }: Props) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <CalendarCheck className="h-4 w-4" />
          Upcoming Events
        </CardTitle>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground">No upcoming events.</p>
        ) : (
          <ul className="space-y-3">
            {events.map((e) => (
              <li key={e.id}>
                <Link href="/admin/events" className="group block">
                  <p className="text-sm font-medium group-hover:underline">{e.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDateRange(e.startDate, e.endDate, timezone)}
                    {e.location && (
                      <span className="ml-2 inline-flex items-center gap-0.5">
                        <MapPin className="h-3 w-3" />{e.location}
                      </span>
                    )}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
