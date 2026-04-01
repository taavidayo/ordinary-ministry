"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { BellRing, Check, X } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"

export interface ServiceRequestItem {
  id: string
  status: string
  role: { name: string }
  serviceTeam: {
    team: { name: string }
    service: { id: string; title: string; date: string }
  }
}

interface Props {
  slots: ServiceRequestItem[]
  timezone: string
}

export default function ServiceRequestsWidget({ slots: initial, timezone }: Props) {
  const [slots, setSlots] = useState(initial)
  const [loading, setLoading] = useState<string | null>(null)

  async function respond(slotId: string, status: "ACCEPTED" | "DECLINED") {
    setLoading(slotId)
    const res = await fetch(`/api/slots/${slotId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    })
    setLoading(null)
    if (!res.ok) { toast.error("Failed to respond"); return }
    setSlots((prev) => prev.filter((s) => s.id !== slotId))
    toast.success(status === "ACCEPTED" ? "Accepted!" : "Declined")
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <BellRing className="h-4 w-4" />
          Service Requests
          {slots.length > 0 && (
            <span className="ml-auto bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5 leading-none">
              {slots.length}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto">
        {slots.length === 0 ? (
          <p className="text-sm text-muted-foreground">No pending requests.</p>
        ) : (
          <ul className="space-y-3">
            {slots.map((s) => (
              <li key={s.id} className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium leading-tight">
                    <Link href={`/mychurch/services/${s.serviceTeam.service.id}`} className="hover:underline">
                      {s.serviceTeam.service.title ||
                        new Date(s.serviceTeam.service.date).toLocaleDateString("en-US", {
                          weekday: "short", month: "short", day: "numeric", timeZone: timezone,
                        })}
                    </Link>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(s.serviceTeam.service.date).toLocaleDateString("en-US", {
                      weekday: "long", month: "long", day: "numeric", timeZone: timezone,
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
                    disabled={loading === s.id}
                    onClick={() => respond(s.id, "ACCEPTED")}
                  >
                    <Check className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 px-2 text-red-600 border-red-200 hover:bg-red-50"
                    disabled={loading === s.id}
                    onClick={() => respond(s.id, "DECLINED")}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
