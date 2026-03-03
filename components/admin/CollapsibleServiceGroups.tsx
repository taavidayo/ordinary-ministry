"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ChevronDown, ChevronRight, Trash2 } from "lucide-react"
import { CATEGORY_COLORS, ROLE_BADGE, ROLE_LABELS } from "@/lib/category-colors"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
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

interface ServiceGroup {
  key: string
  meta?: { color: string; minRole: string }
  services: ServiceRow[]
}

interface Props {
  groups: ServiceGroup[]
  isAdmin: boolean
}

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return "just now"
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

export default function CollapsibleServiceGroups({ groups: initialGroups, isAdmin }: Props) {
  const router = useRouter()
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const [groups, setGroups] = useState(initialGroups)
  const [deleteTarget, setDeleteTarget] = useState<ServiceRow | null>(null)
  const [deleting, setDeleting] = useState(false)

  function toggle(key: string) {
    setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    const res = await fetch(`/api/services/${deleteTarget.id}`, { method: "DELETE" })
    setDeleting(false)
    if (!res.ok) { toast.error("Failed to delete service"); return }
    const label = deleteTarget.title || new Date(deleteTarget.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    toast.success(`"${label}" deleted`)
    setDeleteTarget(null)
    setGroups((prev) =>
      prev
        .map((g) => ({ ...g, services: g.services.filter((s) => s.id !== deleteTarget.id) }))
        .filter((g) => g.services.length > 0)
    )
    router.refresh()
  }

  return (
    <>
      <div className="space-y-4">
        {groups.map(({ key, meta, services }) => {
          const isCollapsed = collapsed[key] ?? false
          const colors = meta ? (CATEGORY_COLORS[meta.color] ?? CATEGORY_COLORS.gray) : null
          return (
            <div key={key}>
              {/* Group header */}
              <button
                type="button"
                onClick={() => toggle(key)}
                className="w-full flex items-center gap-2 mb-2 group"
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {colors && <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${colors.dot}`} />}
                  <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    {key}
                  </h2>
                  {meta && isAdmin && (
                    <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${ROLE_BADGE[meta.minRole]}`}>
                      {ROLE_LABELS[meta.minRole]}
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground">({services.length})</span>
                </div>
                {isCollapsed
                  ? <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                }
              </button>

              {/* Service rows */}
              {!isCollapsed && (
                <div className="bg-white rounded-lg border divide-y">
                  {services.map((s) => (
                    <div key={s.id} className="flex items-center group/row">
                      <Link
                        href={`/admin/services/${s.id}`}
                        className="flex items-center justify-between flex-1 px-4 py-3 hover:bg-gray-50 transition-colors min-w-0"
                      >
                        <div className="min-w-0 flex-1">
                          {/* Series */}
                          {s.series && (
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-0.5">
                              {s.series.name}
                            </p>
                          )}
                          {/* Date */}
                          <p className="font-medium">
                            {new Date(s.date).toLocaleDateString("en-US", {
                              weekday: "long",
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })}
                          </p>
                          {/* Title (if set) */}
                          {s.title && (
                            <p className="text-sm text-muted-foreground">{s.title}</p>
                          )}
                          {/* Last updated */}
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Updated {formatRelativeTime(s.updatedAt)}
                            {s.updatedBy && ` by ${s.updatedBy.name}`}
                          </p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 ml-3" />
                      </Link>
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(s)}
                          className="px-3 py-3 text-muted-foreground opacity-0 group-hover/row:opacity-100 hover:text-destructive transition-all shrink-0"
                          title="Delete service"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Service</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete{" "}
            <span className="font-medium text-foreground">
              "{deleteTarget?.title || new Date(deleteTarget?.date ?? "").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}"
            </span>?
            This will remove all service times, program items, and team assignments and cannot be undone.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" size="sm" onClick={confirmDelete} disabled={deleting}>
              {deleting ? "Deleting…" : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
