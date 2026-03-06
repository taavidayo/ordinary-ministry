"use client"

import { useState, useCallback, useRef } from "react"
import { SlidersHorizontal, Megaphone, X, Move } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { toast } from "sonner"
import ServiceRequestsWidget, { ServiceRequestItem } from "./ServiceRequestsWidget"
import UpcomingServicesWidget, { UpcomingServiceItem } from "./UpcomingServicesWidget"
import AnnouncementsWidget, { AnnouncementItem } from "./AnnouncementsWidget"
import TasksWidget, { TaskItem } from "./TasksWidget"
import EventsWidget, { EventItem } from "./EventsWidget"
import MyProfileWidget, { UserProfileData } from "./MyProfileWidget"

// react-grid-layout v1 uses CommonJS `export =`; require() avoids TS type issues
// eslint-disable-next-line @typescript-eslint/no-require-imports
const GridLayout = require("react-grid-layout")
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { WidthProvider } = require("react-grid-layout") as { WidthProvider: <T>(c: T) => T }
const ResponsiveGridLayout = WidthProvider(GridLayout)
type Layout = { i: string; x: number; y: number; w: number; h: number }

const WIDGET_DEFS = [
  { id: "service-requests", label: "Service Requests" },
  { id: "upcoming-services", label: "Upcoming Services" },
  { id: "tasks",             label: "My Tasks" },
  { id: "events",            label: "Upcoming Events" },
] as const

type WidgetId = typeof WIDGET_DEFS[number]["id"]

interface WidgetRow {
  widgetId: string; visible: boolean; order: number; width: number
  gridX: number; gridY: number; gridW: number; gridH: number
}

interface WidgetState {
  id: WidgetId
  visible: boolean
  gridX: number
  gridY: number
  gridW: number
  gridH: number
}

interface Props {
  serviceRequests: ServiceRequestItem[]
  upcomingServices: UpcomingServiceItem[]
  announcements: AnnouncementItem[]
  tasks: TaskItem[]
  events: EventItem[]
  widgetRows: WidgetRow[]
  userProfile: UserProfileData | null
  isAdmin: boolean
  timezone: string
}

function buildWidgets(rows: WidgetRow[]): WidgetState[] {
  const map = new Map(rows.map((r) => [r.widgetId, r]))
  return WIDGET_DEFS.map((d, i) => {
    const saved = map.get(d.id)
    return {
      id: d.id,
      visible: saved?.visible ?? true,
      gridX: saved?.gridX ?? (i % 2) * 6,
      gridY: saved?.gridY ?? Math.floor(i / 2) * 4,
      gridW: saved?.gridW ?? 6,
      gridH: saved?.gridH ?? 4,
    }
  })
}

export default function Dashboard({
  serviceRequests,
  upcomingServices,
  announcements: initialAnnouncements,
  tasks,
  events,
  widgetRows,
  userProfile,
  isAdmin,
  timezone,
}: Props) {
  const [widgets, setWidgets] = useState<WidgetState[]>(() => buildWidgets(widgetRows))
  const [announcements, setAnnouncements] = useState(initialAnnouncements)
  const [banner, setBanner] = useState<AnnouncementItem | null>(null)
  const [editing, setEditing] = useState(false)
  const [customizeOpen, setCustomizeOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const visible = widgets.filter((w) => w.visible)

  // Always track the latest layout from react-grid-layout so stopEditing
  // can read it synchronously, bypassing any pending setState batching.
  const latestLayoutRef = useRef<Layout[]>([])

  function handleLayoutChange(newLayout: Layout[]) {
    latestLayoutRef.current = newLayout
    if (!editing) return
    setWidgets((prev) =>
      prev.map((w) => {
        const item = newLayout.find((l) => l.i === w.id)
        if (!item) return w
        return { ...w, gridX: item.x, gridY: item.y, gridW: item.w, gridH: item.h }
      })
    )
  }

  function toggleVisible(id: WidgetId, v: boolean) {
    setWidgets((prev) => prev.map((w) => w.id === id ? { ...w, visible: v } : w))
  }

  const persistWidgets = useCallback(async (current: WidgetState[]) => {
    setSaving(true)
    const res = await fetch("/api/dashboard/widgets", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        widgets: current.map((w) => ({
          widgetId: w.id,
          visible: w.visible,
          order: 0,
          width: 1,
          gridX: w.gridX,
          gridY: w.gridY,
          gridW: w.gridW,
          gridH: w.gridH,
        })),
      }),
    })
    setSaving(false)
    if (!res.ok) toast.error("Failed to save layout")
    else toast.success("Layout saved")
  }, [])

  function stopEditing() {
    // Merge the latest react-grid-layout positions from the ref into widget state
    // so we don't depend on setState batching order before persisting.
    const latest = latestLayoutRef.current
    const updatedWidgets = widgets.map((w) => {
      const item = latest.find((l) => l.i === w.id)
      if (!item) return w
      return { ...w, gridX: item.x, gridY: item.y, gridW: item.w, gridH: item.h }
    })
    setWidgets(updatedWidgets)
    setEditing(false)
    persistWidgets(updatedWidgets)
  }

  function handleNewAnnouncement(a: AnnouncementItem) {
    setAnnouncements((prev) => [a, ...prev])
    setBanner(a)
  }

  function renderWidget(id: WidgetId) {
    switch (id) {
      case "service-requests":  return <ServiceRequestsWidget slots={serviceRequests} timezone={timezone} />
      case "upcoming-services": return <UpcomingServicesWidget slots={upcomingServices} timezone={timezone} />
      case "tasks":             return <TasksWidget tasks={tasks} />
      case "events":            return <EventsWidget events={events} timezone={timezone} />
    }
  }

  return (
    <div className="space-y-4">
      {/* Announcement banner */}
      {banner && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
          <Megaphone className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-900">{banner.title}</p>
            <p className="text-sm text-amber-800 whitespace-pre-wrap">{banner.body}</p>
          </div>
          <button onClick={() => setBanner(null)} className="text-amber-500 hover:text-amber-700 shrink-0">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <div className="flex gap-2">
          {editing ? (
            <Button size="sm" onClick={stopEditing} disabled={saving}>
              {saving ? "Saving…" : "Done"}
            </Button>
          ) : (
            <>
              <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                <Move className="h-4 w-4 mr-1.5" /> Edit Layout
              </Button>
              <Button variant="outline" size="sm" onClick={() => setCustomizeOpen(true)}>
                <SlidersHorizontal className="h-4 w-4 mr-1.5" /> Widgets
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Edit mode hint */}
      {editing && (
        <p className="text-xs text-muted-foreground">
          Drag any widget to reposition it · Drag the corner handles to resize
        </p>
      )}

      {/* ── Pinned top strip: My Profile + Announcements integrated ── */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="flex flex-col sm:flex-row">
          {userProfile && (
            <div className="sm:w-72 shrink-0">
              <MyProfileWidget user={userProfile} timezone={timezone} />
            </div>
          )}
          <div className={userProfile ? "flex-1 min-w-0 border-t sm:border-t-0 sm:border-l" : "w-full"}>
            <AnnouncementsWidget
              announcements={announcements}
              isAdmin={isAdmin}
              onNew={handleNewAnnouncement}
            />
          </div>
        </div>
      </div>

      {/* ── Free-form draggable widget grid ── */}
      {visible.length > 0 && (
        <ResponsiveGridLayout
          layout={visible.map((w) => ({ i: w.id, x: w.gridX, y: w.gridY, w: w.gridW, h: w.gridH }))}
          cols={12}
          rowHeight={72}
          isDraggable={editing}
          isResizable={editing}
          resizeHandles={["se", "sw", "ne", "nw"]}
          margin={[16, 16]}
          containerPadding={[0, 0]}
          compactType="vertical"
          onLayoutChange={handleLayoutChange}
          draggableCancel="button,a,input,textarea,select,[role=button]"
          style={{ minHeight: editing ? 200 : undefined }}
        >
          {visible.map((w) => (
            <div
              key={w.id}
              className={editing
                ? "rounded-xl ring-2 ring-primary/25 ring-offset-0 cursor-grab active:cursor-grabbing"
                : "overflow-hidden"
              }
            >
              {renderWidget(w.id)}
            </div>
          ))}
        </ResponsiveGridLayout>
      )}

      {/* Widgets dialog */}
      <Dialog open={customizeOpen} onOpenChange={setCustomizeOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Manage Widgets</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Choose which widgets to show on your dashboard.</p>
          <ul className="space-y-2 mt-1">
            {WIDGET_DEFS.map((d) => {
              const w = widgets.find((x) => x.id === d.id)!
              return (
                <li key={d.id} className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id={`widget-${d.id}`}
                    checked={w.visible}
                    onChange={(e) => toggleVisible(d.id, e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 cursor-pointer"
                  />
                  <label htmlFor={`widget-${d.id}`} className="text-sm cursor-pointer select-none flex-1">
                    {d.label}
                  </label>
                </li>
              )
            })}
          </ul>
          <div className="flex gap-2 pt-2">
            <Button size="sm" onClick={() => { persistWidgets(widgets); setCustomizeOpen(false) }} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setCustomizeOpen(false)}>Cancel</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
