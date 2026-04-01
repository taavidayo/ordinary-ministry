"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { SlidersHorizontal, Megaphone, X, GripVertical } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import ServiceRequestsWidget, { type ServiceRequestItem } from "./ServiceRequestsWidget"
import UpcomingServicesWidget, { type UpcomingServiceItem } from "./UpcomingServicesWidget"
import AnnouncementsWidget, { type AnnouncementItem } from "./AnnouncementsWidget"
import TasksWidget, { type TaskItem, type TeamTaskItem } from "./TasksWidget"
import EventsWidget, { type EventItem } from "./EventsWidget"
import MyProfileWidget, { type UserProfileData } from "./MyProfileWidget"
import PinnedLinksWidget, { type PinnedLinkItem } from "./PinnedLinksWidget"

const WIDGET_DEFS = [
  { id: "service-requests", label: "Service Requests" },
  { id: "upcoming-services", label: "Upcoming Services" },
  { id: "tasks",             label: "My Tasks" },
  { id: "events",            label: "Upcoming Events" },
  { id: "pinned-links",      label: "Pinned Links" },
] as const

type WidgetId = typeof WIDGET_DEFS[number]["id"]

interface WidgetRow {
  widgetId: string; visible: boolean; order: number; width: number
  gridX: number; gridY: number; gridW: number; gridH: number
}

interface WidgetState {
  id: WidgetId
  visible: boolean
  gridY: number
}

interface Props {
  serviceRequests: ServiceRequestItem[]
  upcomingServices: UpcomingServiceItem[]
  announcements: AnnouncementItem[]
  tasks: TaskItem[]
  teamTasks?: TeamTaskItem[]
  events: EventItem[]
  pinnedLinks: PinnedLinkItem[]
  widgetRows: WidgetRow[]
  userProfile: UserProfileData | null
  canPost: boolean
  timezone: string
}

function buildWidgets(rows: WidgetRow[]): WidgetState[] {
  const map = new Map(rows.map((r) => [r.widgetId, r]))
  return WIDGET_DEFS.map((d, i) => {
    const saved = map.get(d.id)
    return {
      id: d.id,
      visible: saved?.visible ?? true,
      gridY: saved?.gridY ?? i * 4,
    }
  })
}

// ── Sortable item inside the Sheet ───────────────────────────────────────────

interface SortableWidgetItemProps {
  widget: WidgetState
  label: string
  onToggle: (id: WidgetId, visible: boolean) => void
}

function SortableWidgetItem({ widget, label, onToggle }: SortableWidgetItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: widget.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 py-3 border-b last:border-b-0"
    >
      <button
        {...attributes}
        {...listeners}
        className="touch-none cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
        aria-label="Drag to reorder"
        tabIndex={0}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <span className="flex-1 text-sm select-none">{label}</span>
      <Switch
        checked={widget.visible}
        onCheckedChange={(checked) => onToggle(widget.id, checked)}
      />
    </div>
  )
}

// ── Main Dashboard component ─────────────────────────────────────────────────

export default function Dashboard({
  serviceRequests,
  upcomingServices,
  announcements: initialAnnouncements,
  tasks,
  teamTasks,
  events,
  pinnedLinks,
  widgetRows,
  userProfile,
  canPost,
  timezone,
}: Props) {
  const [widgets, setWidgets] = useState<WidgetState[]>(() => buildWidgets(widgetRows))
  const [announcements, setAnnouncements] = useState(initialAnnouncements)
  const [banner, setBanner] = useState<AnnouncementItem | null>(null)
  const [customizeOpen, setCustomizeOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
    }
  }, [])

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
          gridX: 0,
          gridY: w.gridY,
          gridW: 12,
          gridH: 4,
        })),
      }),
    })
    setSaving(false)
    if (!res.ok) toast.error("Failed to save layout")
  }, [])

  function scheduleAutoSave(next: WidgetState[]) {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
    autoSaveTimer.current = setTimeout(() => persistWidgets(next), 800)
  }

  function toggleVisible(id: WidgetId, visible: boolean) {
    setWidgets((prev) => {
      const next = prev.map((w) => w.id === id ? { ...w, visible } : w)
      scheduleAutoSave(next)
      return next
    })
  }

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(TouchSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  // All widgets sorted by gridY for the sheet list
  const orderedAll = widgets.slice().sort((a, b) => a.gridY - b.gridY)

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    setWidgets((prev) => {
      const sorted = prev.slice().sort((a, b) => a.gridY - b.gridY)
      const oldIndex = sorted.findIndex((w) => w.id === active.id)
      const newIndex = sorted.findIndex((w) => w.id === over.id)
      const reordered = arrayMove(sorted, oldIndex, newIndex).map((w, i) => ({
        ...w,
        gridY: i * 4,
      }))
      // Rebuild full list with updated gridY values
      const next = prev.map((w) => {
        const updated = reordered.find((r) => r.id === w.id)
        return updated ?? w
      })
      scheduleAutoSave(next)
      return next
    })
  }

  function handleNewAnnouncement(a: AnnouncementItem) {
    setAnnouncements((prev) => [a, ...prev])
    setBanner(a)
  }

  function renderWidget(id: WidgetId) {
    switch (id) {
      case "service-requests":  return <ServiceRequestsWidget slots={serviceRequests} timezone={timezone} />
      case "upcoming-services": return <UpcomingServicesWidget slots={upcomingServices} timezone={timezone} />
      case "tasks":             return <TasksWidget tasks={tasks} teamTasks={teamTasks} />
      case "events":            return <EventsWidget events={events} timezone={timezone} />
      case "pinned-links":      return <PinnedLinksWidget links={pinnedLinks} />
    }
  }

  const orderedVisible = widgets
    .filter((w) => w.visible)
    .sort((a, b) => a.gridY - b.gridY)

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
        <Button variant="outline" size="sm" onClick={() => setCustomizeOpen(true)}>
          <SlidersHorizontal className="h-4 w-4 mr-1.5" /> Customize
        </Button>
      </div>

      {/* Pinned top strip: My Profile + Announcements */}
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
              canPost={canPost}
              onNew={handleNewAnnouncement}
            />
          </div>
        </div>
      </div>

      {/* Widget grid */}
      {orderedVisible.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {orderedVisible.map((w) => (
            <div key={w.id}>{renderWidget(w.id)}</div>
          ))}
        </div>
      )}

      {/* Customize Sheet */}
      <Sheet open={customizeOpen} onOpenChange={setCustomizeOpen}>
        <SheetContent side="right" className="w-80 sm:w-80">
          <SheetHeader>
            <SheetTitle>Customize Dashboard</SheetTitle>
            <SheetDescription>Drag to reorder · Toggle to show/hide</SheetDescription>
          </SheetHeader>
          {saving && <p className="text-xs text-muted-foreground py-2">Saving…</p>}
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={orderedAll.map((w) => w.id)}
              strategy={verticalListSortingStrategy}
            >
              {orderedAll.map((w) => {
                const def = WIDGET_DEFS.find((d) => d.id === w.id)!
                return (
                  <SortableWidgetItem
                    key={w.id}
                    widget={w}
                    label={def.label}
                    onToggle={toggleVisible}
                  />
                )
              })}
            </SortableContext>
          </DndContext>
        </SheetContent>
      </Sheet>
    </div>
  )
}
