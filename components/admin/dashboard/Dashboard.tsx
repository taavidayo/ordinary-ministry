"use client"

import { useState, useCallback } from "react"
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  useSortable,
  rectSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { SlidersHorizontal, GripVertical, Expand, Shrink, X, Megaphone } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { toast } from "sonner"
import ServiceRequestsWidget, { ServiceRequestItem } from "./ServiceRequestsWidget"
import UpcomingServicesWidget, { UpcomingServiceItem } from "./UpcomingServicesWidget"
import AnnouncementsWidget, { AnnouncementItem } from "./AnnouncementsWidget"
import TasksWidget, { TaskItem } from "./TasksWidget"
import EventsWidget, { EventItem } from "./EventsWidget"
import MyProfileWidget, { UserProfileData } from "./MyProfileWidget"

// Only these widgets are draggable; announcements is pinned at top
const WIDGET_DEFS = [
  { id: "service-requests", label: "Service Requests" },
  { id: "upcoming-services", label: "Upcoming Services" },
  { id: "tasks",             label: "My Tasks" },
  { id: "events",            label: "Upcoming Events" },
] as const

type WidgetId = typeof WIDGET_DEFS[number]["id"]

interface WidgetRow { widgetId: string; visible: boolean; order: number; width: number }

interface WidgetState {
  id: WidgetId
  visible: boolean
  order: number
  width: 1 | 2
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
      order: saved?.order ?? i,
      width: ((saved?.width ?? 1) as 1 | 2),
    }
  }).sort((a, b) => a.order - b.order)
}

function SortableWidget({
  widget,
  editing,
  onToggleWidth,
  children,
}: {
  widget: WidgetState
  editing: boolean
  onToggleWidth: (id: WidgetId) => void
  children: React.ReactNode
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: widget.id })

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
        // Inline style for col-span — avoids Tailwind purge issues
        gridColumn: widget.width === 2 ? "span 2" : "span 1",
      }}
    >
      <div className="relative h-full">
        {editing && (
          <div className="absolute top-2 right-2 z-10 flex items-center gap-0.5 bg-white/95 border rounded-md shadow-sm px-1 py-0.5">
            <button
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing p-1 text-muted-foreground hover:text-foreground touch-none"
              title="Drag to reorder"
            >
              <GripVertical className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => onToggleWidth(widget.id)}
              className="p-1 text-muted-foreground hover:text-foreground"
              title={widget.width === 1 ? "Expand to full width" : "Shrink to half width"}
            >
              {widget.width === 1
                ? <Expand className="h-3.5 w-3.5" />
                : <Shrink className="h-3.5 w-3.5" />}
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  )
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
  const [activeId, setActiveId] = useState<WidgetId | null>(null)
  const [saving, setSaving] = useState(false)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const visible = widgets.filter((w) => w.visible)

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as WidgetId)
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null)
    const { active, over } = event
    if (!over || active.id === over.id) return
    setWidgets((prev) => {
      const visibleIds = prev.filter((w) => w.visible).map((w) => w.id)
      const oldIdx = visibleIds.indexOf(active.id as WidgetId)
      const newIdx = visibleIds.indexOf(over.id as WidgetId)
      const reordered = arrayMove(visibleIds, oldIdx, newIdx)
      return prev.map((w) => ({
        ...w,
        order: reordered.includes(w.id) ? reordered.indexOf(w.id) : w.order,
      })).sort((a, b) => a.order - b.order)
    })
  }

  function toggleWidth(id: WidgetId) {
    setWidgets((prev) =>
      prev.map((w) => w.id === id ? { ...w, width: w.width === 1 ? 2 : 1 } : w)
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
          order: w.order,
          width: w.width,
        })),
      }),
    })
    setSaving(false)
    if (!res.ok) toast.error("Failed to save layout")
    else toast.success("Layout saved")
  }, [])

  function stopEditing() {
    setEditing(false)
    persistWidgets(widgets)
  }

  function handleNewAnnouncement(a: AnnouncementItem) {
    setAnnouncements((prev) => [a, ...prev])
    setBanner(a)
  }

  const activeWidget = activeId ? widgets.find((w) => w.id === activeId) : null

  function renderDraggableWidget(id: WidgetId) {
    switch (id) {
      case "service-requests":  return <ServiceRequestsWidget slots={serviceRequests} timezone={timezone} />
      case "upcoming-services": return <UpcomingServicesWidget slots={upcomingServices} timezone={timezone} />
      case "tasks":             return <TasksWidget tasks={tasks} />
      case "events":            return <EventsWidget events={events} timezone={timezone} />
    }
  }

  return (
    <div className="space-y-4">
      {/* Announcement banner — shows when admin posts a new one */}
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
                <GripVertical className="h-4 w-4 mr-1.5" /> Edit Layout
              </Button>
              <Button variant="outline" size="sm" onClick={() => setCustomizeOpen(true)}>
                <SlidersHorizontal className="h-4 w-4 mr-1.5" /> Widgets
              </Button>
            </>
          )}
        </div>
      </div>

      {/* ── Pinned top row: My Profile (narrow) + Announcements (wide) ── */}
      <div style={{ display: "grid", gridTemplateColumns: userProfile ? "280px 1fr" : "1fr", gap: "1rem" }}>
        {userProfile && <MyProfileWidget user={userProfile} timezone={timezone} />}
        <AnnouncementsWidget
          announcements={announcements}
          isAdmin={isAdmin}
          onNew={handleNewAnnouncement}
        />
      </div>

      {/* ── Draggable widget grid ── */}
      {visible.length > 0 && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={visible.map((w) => w.id)} strategy={rectSortingStrategy}>
            <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(2, 1fr)" }}>
              {visible.map((w) => (
                <SortableWidget key={w.id} widget={w} editing={editing} onToggleWidth={toggleWidth}>
                  {renderDraggableWidget(w.id)}
                </SortableWidget>
              ))}
            </div>
          </SortableContext>

          <DragOverlay>
            {activeWidget && (
              <div className="opacity-90 rotate-1 shadow-xl">
                {renderDraggableWidget(activeWidget.id)}
              </div>
            )}
          </DragOverlay>
        </DndContext>
      )}

      {/* Widgets dialog */}
      <Dialog open={customizeOpen} onOpenChange={setCustomizeOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Manage Widgets</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Choose which widgets to show.</p>
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
