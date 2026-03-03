"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CalendarDays, ChevronRight } from "lucide-react"
import Link from "next/link"

export interface UpcomingServiceItem {
  id: string
  status: string
  role: { name: string }
  serviceTeam: {
    team: { name: string }
    service: { id: string; title: string; date: string }
  }
}

interface Props {
  slots: UpcomingServiceItem[]
  timezone: string
}

export default function UpcomingServicesWidget({ slots, timezone }: Props) {
  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <CalendarDays className="h-4 w-4" />
          Upcoming Services
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto">
        {slots.length === 0 ? (
          <p className="text-sm text-muted-foreground">No upcoming assignments.</p>
        ) : (
          <ul className="space-y-2">
            {slots.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/admin/services/${s.serviceTeam.service.id}`}
                  className="flex items-center justify-between gap-3 group"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium leading-tight group-hover:underline">
                      {new Date(s.serviceTeam.service.date).toLocaleDateString("en-US", {
                        weekday: "short", month: "short", day: "numeric", timeZone: timezone,
                      })}
                      {s.serviceTeam.service.title && (
                        <span className="text-muted-foreground font-normal"> — {s.serviceTeam.service.title}</span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {s.serviceTeam.team.name} · {s.role.name}
                      {s.status === "PENDING" && (
                        <span className="ml-1.5 text-amber-600 font-medium">(pending)</span>
                      )}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
