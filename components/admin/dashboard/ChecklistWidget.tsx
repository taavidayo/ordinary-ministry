"use client"
import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

interface ServiceSummary {
  id: string
  title: string
  date: string
  total: number
  done: number
}

export default function ChecklistWidget({ teamId }: { teamId?: string }) {
  const [services, setServices] = useState<ServiceSummary[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const url = teamId
      ? `/api/dashboard/checklist-stats?teamId=${teamId}`
      : `/api/dashboard/checklist-stats`
    fetch(url)
      .then(r => r.json())
      .then(d => { setServices(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [teamId])

  if (loading) return <div className="p-4 text-xs text-muted-foreground">Loading…</div>
  if (services.length === 0) return <div className="p-4 text-xs text-muted-foreground">No recent services with checklists.</div>

  return (
    <div className="p-3 space-y-2 overflow-auto h-full">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Checklist Completion</h3>
      {services.map(s => {
        const pct = s.total > 0 ? Math.round((s.done / s.total) * 100) : 0
        return (
          <div key={s.id} className="space-y-0.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium truncate flex-1">{s.title || new Date(s.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
              <span className={cn("text-[10px] font-medium ml-2", pct === 100 ? "text-green-500" : "text-muted-foreground")}>
                {s.done}/{s.total}
              </span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className={cn("h-full rounded-full transition-all", pct === 100 ? "bg-green-500" : "bg-primary")}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
