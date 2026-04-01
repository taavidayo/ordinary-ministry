"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ChevronDown, ChevronRight, Trash2, LayoutGrid } from "lucide-react"
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
  meta?: { id: string; color: string; minRole: string }
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
              <div className="w-full flex items-center gap-2 mb-2">
                <button
                  type="button"
                  onClick={() => toggle(key)}
                  className="flex items-center gap-2 flex-1 min-w-0 group"
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
                {meta?.id && (
                  <Link
                    href={`/mychurch/services/matrix?categoryId=${meta.id}`}
                    className="h-6 w-6 inline-flex items-center justify-center rounded border bg-card hover:bg-accent/50 text-muted-foreground shrink-0"
                    title="Matrix view"
                  >
                    <LayoutGrid className="h-3.5 w-3.5" />
                  </Link>
                )}
              </div>

              {/* Service rows */}
              {!isCollapsed && (
                <div className="bg-card rounded-lg border overflow-hidden">
                  {/* Table header */}
                  <div className="grid gap-x-4 px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wide border-b bg-muted/50 items-center"
                    style={{ gridTemplateColumns: "160px 1fr 160px 160px 20px" }}
                  >
                    <span>Date</span>
                    <span>Title</span>
                    <span>Series</span>
                    <span>Updated</span>
                    <span />
                  </div>
                  {/* Rows */}
                  {services.map((s) => (
                    <div key={s.id} className="flex items-center group/row border-t first:border-t-0">
                      <Link
                        href={`/mychurch/services/${s.id}`}
                        className="grid gap-x-4 px-4 py-2.5 flex-1 hover:bg-accent/50 transition-colors items-center min-w-0"
                        style={{ gridTemplateColumns: "160px 1fr 160px 160px 20px" }}
                      >
                        <span className="text-sm font-medium truncate">
                          {new Date(s.date).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                        <span className="text-sm truncate text-foreground">
                          {s.title || <span className="text-muted-foreground">—</span>}
                        </span>
                        <span className="text-sm truncate text-muted-foreground">
                          {s.series?.name || <span>—</span>}
                        </span>
                        <span className="text-xs text-muted-foreground truncate">
                          {formatRelativeTime(s.updatedAt)}
                          {s.updatedBy && ` · ${s.updatedBy.name}`}
                        </span>
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0 justify-self-end" />
                      </Link>
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(s)}
                          className="px-3 py-2.5 text-muted-foreground opacity-0 group-hover/row:opacity-100 hover:text-destructive transition-all shrink-0"
                          title="Delete service"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
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
