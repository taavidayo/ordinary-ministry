"use client"
import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { Check } from "lucide-react"

interface ChecklistItem {
  id: string
  content: string
  isHeader: boolean
  done: boolean
  order: number
  roleId: string | null
  role: { id: string; name: string } | null
  completedBy: { id: string; name: string } | null
  completedAt: string | null
  templateChecklistId: string | null
}

interface ServiceTeamData {
  id: string
  team: { id: string; name: string }
  checklistItems: ChecklistItem[]
  slots: { userId: string | null; roleId: string }[]
}

export default function ServiceChecklist({
  serviceId,
  currentUserId,
}: {
  serviceId: string
  currentUserId: string
}) {
  const [items, setItems] = useState<(ChecklistItem & { serviceTeamId: string; isMyItem: boolean })[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/services/${serviceId}/checklist?userId=${encodeURIComponent(currentUserId)}`)
      .then(r => r.json())
      .then((data: ServiceTeamData[]) => {
        // Flatten all items from all teams, filtering to user's roles
        const flat = data.flatMap(st => {
          const userRoleIds = new Set(st.slots.filter(s => s.userId === currentUserId).map(s => s.roleId))
          return st.checklistItems
            .filter(item => item.isHeader || !item.roleId || userRoleIds.has(item.roleId))
            .map(item => ({
              ...item,
              serviceTeamId: st.id,
              isMyItem: !item.roleId || userRoleIds.has(item.roleId),
            }))
        })
        setItems(flat)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [serviceId, currentUserId])

  async function toggleItem(item: ChecklistItem & { serviceTeamId: string }) {
    if (item.isHeader) return
    const newDone = !item.done
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, done: newDone } : i))
    const res = await fetch(`/api/services/${serviceId}/checklist/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ done: newDone }),
    })
    if (!res.ok) {
      toast.error("Failed to update")
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, done: item.done } : i))
    } else {
      const updated = await res.json()
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, done: updated.done, completedBy: updated.completedBy, completedAt: updated.completedAt } : i))
    }
  }

  if (loading) return <div className="text-xs text-muted-foreground py-2">Loading…</div>

  const actionable = items.filter(i => !i.isHeader)
  if (actionable.length === 0) return <div className="text-xs text-muted-foreground py-2">No checklist items assigned to your role.</div>

  const doneCount = actionable.filter(i => i.done).length

  return (
    <div className="space-y-0.5">
      <div className="flex items-center justify-between pb-1">
        <span className="text-xs text-muted-foreground">{doneCount}/{actionable.length} complete</span>
        {doneCount === actionable.length && (
          <span className="text-[10px] text-green-600 font-medium flex items-center gap-0.5">
            <Check className="h-3 w-3" /> All done
          </span>
        )}
      </div>
      {items.map(item => {
        if (item.isHeader) {
          return (
            <div key={item.id} className="px-2 py-1.5 rounded bg-muted mt-1">
              <span className="text-[10px] font-bold uppercase tracking-wide text-gray-600">{item.content}</span>
            </div>
          )
        }
        return (
          <button
            key={item.id}
            type="button"
            disabled={!item.isMyItem}
            onClick={() => toggleItem(item)}
            className={cn(
              "w-full flex items-center gap-2 rounded px-2 py-1.5 text-left transition-colors",
              item.isMyItem ? "hover:bg-muted/60 cursor-pointer" : "cursor-default opacity-50",
              item.done && "opacity-60",
            )}
          >
            <span className={cn(
              "flex-shrink-0 h-4 w-4 rounded border flex items-center justify-center transition-colors",
              item.done ? "bg-green-500 border-green-500" : "border-input bg-background",
            )}>
              {item.done && <Check className="h-2.5 w-2.5 text-white" />}
            </span>
            <span className={cn("text-xs flex-1", item.done && "line-through text-muted-foreground")}>{item.content}</span>
            {item.role && <span className="text-[10px] text-muted-foreground shrink-0">{item.role.name}</span>}
            {item.completedBy && <span className="text-[10px] text-muted-foreground shrink-0">{item.completedBy.name}</span>}
          </button>
        )
      })}
    </div>
  )
}
