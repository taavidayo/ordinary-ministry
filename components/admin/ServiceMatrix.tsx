"use client"

import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import { toast } from "sonner"
import {
  ExternalLink, Plus, X, Upload, Layers, LayoutTemplate, AlertTriangle, Search, ChevronLeft,
} from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"

// ── Types ────────────────────────────────────────────────────────────────────

type ProgramItemType = "SONG" | "SERMON" | "PRAYER" | "ITEM" | "HEADER"

interface User { id: string; name: string; email: string }
interface Role { id: string; name: string; needed: number }
interface Slot { id: string; role: Role; user: User | null; status: string; rehearsal: boolean; notes: string | null }
interface ServiceTeam { id: string; team: { id: string; name: string }; serviceTimeId: string | null; slots: Slot[] }
interface Series { id: string; name: string; imageUrl: string | null }
interface Template { id: string; name: string; description: string | null }
interface ProgramItem {
  id: string; type: ProgramItemType; order: number; name: string | null; notes: string | null
  sermonPassage: string | null; song: { id: string; title: string; author: string | null } | null
  arrangement: { id: string; name: string } | null; syncGroupId: string | null
}
interface ServiceTime { id: string; label: string; startTime: string | null; order: number; items: ProgramItem[] }
interface ServiceScheduleEntry { id: string; label: string; startTime: string | null; order: number }

interface MatrixService {
  id: string; title: string; date: string; notes: string | null; seriesId: string | null
  series: Series | null; times: ServiceTime[]; teams: ServiceTeam[]
  scheduleEntries: ServiceScheduleEntry[]
}

interface TeamDef {
  id: string; name: string; roles: Role[]; members: { user: User }[]
}

interface Props {
  category: { id: string; name: string; color: string; minRole: string }
  services: MatrixService[]
  allTeams: TeamDef[]
  allSeries: Series[]
  allTemplates: Template[]
}

// ── Constants ────────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<ProgramItemType, string> = {
  SONG: "Song", SERMON: "Sermon", PRAYER: "Prayer", ITEM: "Item", HEADER: "Header",
}

const TYPE_COLORS: Record<ProgramItemType, string> = {
  SONG: "bg-blue-100 text-blue-700",
  SERMON: "bg-purple-100 text-purple-700",
  PRAYER: "bg-green-100 text-green-700",
  ITEM: "bg-muted text-gray-700",
  HEADER: "bg-border text-gray-600",
}

function getInitials(name: string): string {
  return name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase()
}

// ── Drag payload types ───────────────────────────────────────────────────────

type DragPayload =
  | {
      kind: "item"
      item: {
        id: string; type: ProgramItemType; order: number; name: string | null; notes: string | null
        sermonPassage: string | null; songId: string | null; arrangementId: string | null
        songTitle: string | null; arrangementName: string | null
      }
      sourceServiceId: string
      sourceTimeId: string
    }
  | {
      kind: "slot"
      userId: string; userName: string; userEmail: string
      roleId: string; roleName: string; teamId: string; teamName: string
      sourceServiceId: string
    }

// ── Main component ───────────────────────────────────────────────────────────

export default function ServiceGrid({ category, services: initServices, allTeams, allSeries: initSeries, allTemplates }: Props) {
  const [services, setServices] = useState<MatrixService[]>(initServices)
  const [seriesList, setSeriesList] = useState<Series[]>(initSeries)

  // Needed count per role (global, shared across all columns)
  const [neededMap, setNeededMap] = useState<Record<string, number>>(() => {
    const m: Record<string, number> = {}
    allTeams.forEach((t) => t.roles.forEach((r) => { m[r.id] = r.needed }))
    return m
  })

  // Availability map: date string → Set of blocked userId
  const [availabilityMap, setAvailabilityMap] = useState<Map<string, Set<string>>>(new Map())

  // Drag state
  const [dragOver, setDragOver] = useState<{ serviceId: string; timeId?: string; roleId?: string } | null>(null)

  // Series picker (shared dialog)
  const [activeSeriesServiceId, setActiveSeriesServiceId] = useState<string | null>(null)
  const [seriesPickerServices, setSeriesPickerServices] = useState<{ id: string; title: string; date: string; seriesId: string | null }[]>([])
  const [seriesPickerLoading, setSeriesPickerLoading] = useState(false)
  const uploadInputRef = useRef<HTMLInputElement>(null)
  const uploadTargetSeriesId = useRef<string | null>(null)

  // New series dialog
  const [newSeriesOpen, setNewSeriesOpen] = useState(false)
  const [newSeriesName, setNewSeriesName] = useState("")

  // Template import (per-service)
  const [templateImportOpen, setTemplateImportOpen] = useState<Record<string, boolean>>({})
  const [selectedTemplateId, setSelectedTemplateId] = useState<Record<string, string>>({})
  const [importing, setImporting] = useState<Record<string, boolean>>({})

  // Role picker (shared dialog)
  const [rolePickerDialog, setRolePickerDialog] = useState<{
    role: Role; st: ServiceTeam; serviceId: string; members: { user: User }[]
  } | null>(null)
  const [pendingConflict, setPendingConflict] = useState<{
    user: User; conflicts: { roleName: string; teamName: string }[]
  } | null>(null)

  // Add/remove services from grid
  const [addServiceOpen, setAddServiceOpen] = useState(false)
  const [addServiceSearch, setAddServiceSearch] = useState("")
  const [addServiceList, setAddServiceList] = useState<{ id: string; title: string; date: string; categoryName: string | null }[]>([])
  const [addServiceLoading, setAddServiceLoading] = useState(false)
  const [addingServiceId, setAddingServiceId] = useState<string | null>(null)

  // Fetch availability for all service dates on mount
  useEffect(() => {
    const uniqueDates = [...new Set(initServices.map((s) => new Date(s.date).toISOString().split("T")[0]))]
    Promise.all(
      uniqueDates.map((d) =>
        fetch(`/api/availability?date=${d}`)
          .then((r) => r.json())
          .then((list: { userId: string }[]) => [d, new Set(list.map((a) => a.userId))] as const)
          .catch(() => [d, new Set<string>()] as const)
      )
    ).then((entries) => setAvailabilityMap(new Map(entries)))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Series helpers ──────────────────────────────────────────────────────────

  async function openSeriesPicker(serviceId: string) {
    setActiveSeriesServiceId(serviceId)
    if (seriesPickerServices.length > 0) return
    setSeriesPickerLoading(true)
    try {
      const res = await fetch("/api/services")
      const all = await res.json()
      setSeriesPickerServices(
        all.map((s: { id: string; title: string; date: string; seriesId?: string }) => ({
          id: s.id, title: s.title, date: s.date, seriesId: s.seriesId ?? null,
        }))
      )
    } finally {
      setSeriesPickerLoading(false)
    }
  }

  async function updateSeries(serviceId: string, newSeriesId: string) {
    setServices((prev) =>
      prev.map((s) => {
        if (s.id !== serviceId) return s
        const found = seriesList.find((sr) => sr.id === newSeriesId) ?? null
        return { ...s, seriesId: newSeriesId || null, series: newSeriesId ? found : null }
      })
    )
    await fetch(`/api/services/${serviceId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ seriesId: newSeriesId || null }),
    })
  }

  async function createSeries() {
    const name = newSeriesName.trim()
    if (!name) return
    const res = await fetch("/api/series", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    })
    if (!res.ok) return
    const created: Series = await res.json()
    setSeriesList((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)))
    setNewSeriesName("")
    setNewSeriesOpen(false)
    if (activeSeriesServiceId) {
      updateSeries(activeSeriesServiceId, created.id)
    }
    toast.success(`Series "${created.name}" created`)
  }

  function triggerUpload(sId: string) {
    uploadTargetSeriesId.current = sId
    uploadInputRef.current?.click()
  }

  async function uploadSeriesImage(sId: string, file: File) {
    const reader = new FileReader()
    reader.onload = async (e) => {
      const imageUrl = e.target?.result as string
      const res = await fetch(`/api/series/${sId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl }),
      })
      if (res.ok) {
        setSeriesList((prev) => prev.map((s) => (s.id === sId ? { ...s, imageUrl } : s)))
        toast.success("Series artwork updated")
      }
    }
    reader.readAsDataURL(file)
  }

  // ── Template import ─────────────────────────────────────────────────────────

  async function importTemplate(serviceId: string) {
    const templateId = selectedTemplateId[serviceId]
    if (!templateId) return
    setImporting((prev) => ({ ...prev, [serviceId]: true }))
    try {
      const res = await fetch(`/api/templates/${templateId}/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceId }),
      })
      if (!res.ok) { toast.error("Failed to import template"); return }
      const updated = await res.json()
      setServices((prev) =>
        prev.map((s) =>
          s.id !== serviceId ? s : { ...updated, date: new Date(updated.date).toISOString() }
        )
      )
      setTemplateImportOpen((prev) => ({ ...prev, [serviceId]: false }))
      setSelectedTemplateId((prev) => ({ ...prev, [serviceId]: "" }))
      toast.success("Template imported")
    } finally {
      setImporting((prev) => ({ ...prev, [serviceId]: false }))
    }
  }

  // ── Drag handlers ───────────────────────────────────────────────────────────

  function handleItemDragStart(e: React.DragEvent, item: ProgramItem, sourceServiceId: string, sourceTimeId: string) {
    const payload: DragPayload = {
      kind: "item",
      item: {
        id: item.id, type: item.type, order: item.order,
        name: item.name, notes: item.notes, sermonPassage: item.sermonPassage,
        songId: item.song?.id ?? null, arrangementId: item.arrangement?.id ?? null,
        songTitle: item.song?.title ?? null, arrangementName: item.arrangement?.name ?? null,
      },
      sourceServiceId,
      sourceTimeId,
    }
    e.dataTransfer.setData("application/json", JSON.stringify(payload))
    e.dataTransfer.effectAllowed = "copy"
  }

  function handleSlotDragStart(e: React.DragEvent, slot: Slot, st: ServiceTeam, sourceServiceId: string) {
    if (!slot.user) return
    const payload: DragPayload = {
      kind: "slot",
      userId: slot.user.id, userName: slot.user.name, userEmail: slot.user.email,
      roleId: slot.role.id, roleName: slot.role.name,
      teamId: st.team.id, teamName: st.team.name,
      sourceServiceId,
    }
    e.dataTransfer.setData("application/json", JSON.stringify(payload))
    e.dataTransfer.effectAllowed = "copy"
  }

  function handleDragOver(e: React.DragEvent, serviceId: string, timeId?: string, roleId?: string) {
    e.preventDefault()
    e.dataTransfer.dropEffect = "copy"
    setDragOver({ serviceId, timeId, roleId })
  }

  function handleDragLeave(e: React.DragEvent) {
    if (e.currentTarget.contains(e.relatedTarget as Node)) return
    setDragOver(null)
  }

  async function handleDropOnTime(e: React.DragEvent, targetServiceId: string, targetTimeId: string) {
    e.preventDefault()
    setDragOver(null)
    let payload: DragPayload
    try { payload = JSON.parse(e.dataTransfer.getData("application/json")) } catch { return }
    if (payload.kind !== "item") return
    if (payload.sourceServiceId === targetServiceId) return

    const targetService = services.find((s) => s.id === targetServiceId)
    const targetTime = targetService?.times.find((t) => t.id === targetTimeId)
    if (!targetTime) return

    const newOrder = targetTime.items.length
    const tempId = `temp-${Date.now()}`

    // Optimistic update
    setServices((prev) =>
      prev.map((s) => {
        if (s.id !== targetServiceId) return s
        return {
          ...s,
          times: s.times.map((t) => {
            if (t.id !== targetTimeId) return t
            const optimisticItem: ProgramItem = {
              id: tempId,
              type: payload.kind === "item" ? payload.item.type : "ITEM",
              order: newOrder,
              name: payload.kind === "item" ? payload.item.name : null,
              notes: payload.kind === "item" ? payload.item.notes : null,
              sermonPassage: payload.kind === "item" ? payload.item.sermonPassage : null,
              song: (payload.kind === "item" && payload.item.songId)
                ? { id: payload.item.songId, title: payload.item.songTitle ?? "", author: null }
                : null,
              arrangement: (payload.kind === "item" && payload.item.arrangementId)
                ? { id: payload.item.arrangementId, name: payload.item.arrangementName ?? "" }
                : null,
              syncGroupId: null,
            }
            return { ...t, items: [...t.items, optimisticItem] }
          }),
        }
      })
    )

    if (payload.kind !== "item") return
    const { item } = payload
    const res = await fetch(`/api/services/${targetServiceId}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        serviceTimeId: targetTimeId,
        type: item.type,
        order: newOrder,
        name: item.name || null,
        notes: item.notes || null,
        sermonPassage: item.sermonPassage || null,
        ...(item.type === "SONG" && item.songId ? { songId: item.songId, arrangementId: item.arrangementId } : {}),
      }),
    })

    if (res.ok) {
      const created = await res.json()
      // Replace temp item with real item
      setServices((prev) =>
        prev.map((s) => {
          if (s.id !== targetServiceId) return s
          return {
            ...s,
            times: s.times.map((t) => {
              if (t.id !== targetTimeId) return t
              return { ...t, items: t.items.map((it) => (it.id === tempId ? { ...created } : it)) }
            }),
          }
        })
      )
      toast.success("Item copied")
    } else {
      // Rollback
      setServices((prev) =>
        prev.map((s) => {
          if (s.id !== targetServiceId) return s
          return {
            ...s,
            times: s.times.map((t) => {
              if (t.id !== targetTimeId) return t
              return { ...t, items: t.items.filter((it) => it.id !== tempId) }
            }),
          }
        })
      )
      toast.error("Failed to copy item")
    }
  }

  async function handleDropOnRole(
    e: React.DragEvent,
    targetServiceId: string,
    targetServiceTeamId: string,
    targetRoleId: string
  ) {
    e.preventDefault()
    setDragOver(null)
    let payload: DragPayload
    try { payload = JSON.parse(e.dataTransfer.getData("application/json")) } catch { return }
    if (payload.kind !== "slot") return
    if (payload.sourceServiceId === targetServiceId) return

    const targetService = services.find((s) => s.id === targetServiceId)
    if (!targetService) return

    const dateStr = new Date(targetService.date).toISOString().split("T")[0]
    if (availabilityMap.get(dateStr)?.has(payload.userId)) {
      toast.error(`${payload.userName} is unavailable on this date`)
      return
    }

    const res = await fetch("/api/slots", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ serviceTeamId: targetServiceTeamId, roleId: targetRoleId, userId: payload.userId }),
    })

    if (res.ok) {
      const slot = await res.json()
      setServices((prev) =>
        prev.map((s) => {
          if (s.id !== targetServiceId) return s
          return {
            ...s,
            teams: s.teams.map((t) => {
              if (t.id !== targetServiceTeamId) return t
              const idx = t.slots.findIndex((sl) => sl.id === slot.id)
              if (idx >= 0) {
                const updated = [...t.slots]
                updated[idx] = slot
                return { ...t, slots: updated }
              }
              return { ...t, slots: [...t.slots, slot] }
            }),
          }
        })
      )
      toast.success(`${payload.userName} assigned`)
    } else {
      toast.error("Failed to assign user")
    }
  }

  // ── Role picker helpers ──────────────────────────────────────────────────────

  function closeRolePicker() {
    setRolePickerDialog(null)
    setPendingConflict(null)
  }

  async function addSlot(serviceId: string, serviceTeamId: string, roleId: string, userId: string) {
    const res = await fetch("/api/slots", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ serviceTeamId, roleId, userId }),
    })
    if (res.ok) {
      const slot = await res.json()
      setServices((prev) =>
        prev.map((s) => {
          if (s.id !== serviceId) return s
          return {
            ...s,
            teams: s.teams.map((t) => {
              if (t.id !== serviceTeamId) return t
              const idx = t.slots.findIndex((sl) => sl.id === slot.id)
              if (idx >= 0) {
                const updated = [...t.slots]
                updated[idx] = slot
                return { ...t, slots: updated }
              }
              return { ...t, slots: [...t.slots, slot] }
            }),
          }
        })
      )
    }
  }

  async function updateNeeded(roleId: string, needed: number) {
    setNeededMap((prev) => ({ ...prev, [roleId]: needed }))
    await fetch(`/api/roles/${roleId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ needed }),
    })
  }

  async function addTeam(serviceId: string, teamId: string) {
    const svc = services.find((s) => s.id === serviceId)
    if (svc?.teams.some((t) => t.team.id === teamId)) {
      toast.error("Team already added"); return
    }
    const res = await fetch(`/api/services/${serviceId}/teams`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teamId, serviceTimeId: null }),
    })
    if (res.ok) {
      const st = await res.json()
      setServices((prev) =>
        prev.map((s) => s.id !== serviceId ? s : { ...s, teams: [...s.teams, st] })
      )
      toast.success("Team added")
    } else {
      const err = await res.json().catch(() => ({}))
      toast.error(err?.error ?? "Failed to add team")
    }
  }

  function removeService(serviceId: string) {
    setServices((prev) => prev.filter((s) => s.id !== serviceId))
  }

  async function openAddService() {
    setAddServiceOpen(true)
    if (addServiceList.length > 0) return
    setAddServiceLoading(true)
    try {
      const res = await fetch("/api/services/summary")
      const list: { id: string; title: string; date: string; categoryName: string | null }[] = await res.json()
      setAddServiceList(list.filter((s) => !services.some((svc) => svc.id === s.id)))
    } finally {
      setAddServiceLoading(false)
    }
  }

  async function handleAddService(serviceId: string) {
    setAddingServiceId(serviceId)
    try {
      const res = await fetch(`/api/services/${serviceId}`)
      if (!res.ok) { toast.error("Failed to load service"); return }
      const raw = await res.json()
      const svc: MatrixService = {
        id: raw.id,
        title: raw.title ?? "",
        date: typeof raw.date === "string" ? raw.date : new Date(raw.date).toISOString(),
        notes: raw.notes ?? null,
        seriesId: raw.seriesId ?? null,
        series: raw.series ? { id: raw.series.id, name: raw.series.name, imageUrl: raw.series.imageUrl ?? null } : null,
        times: (raw.times ?? []).map((t: Record<string, unknown>) => ({
          id: t.id as string, label: t.label as string,
          startTime: (t.startTime as string | null) ?? null,
          order: t.order as number,
          items: ((t.items ?? []) as Record<string, unknown>[]).map((it) => ({
            id: it.id as string, type: it.type as ProgramItemType,
            order: it.order as number, name: (it.name as string | null) ?? null,
            notes: (it.notes as string | null) ?? null,
            sermonPassage: (it.sermonPassage as string | null) ?? null,
            song: it.song ? {
              id: (it.song as Record<string, string>).id,
              title: (it.song as Record<string, string>).title,
              author: (it.song as Record<string, string>).author ?? null,
            } : null,
            arrangement: it.arrangement ? {
              id: (it.arrangement as Record<string, string>).id,
              name: (it.arrangement as Record<string, string>).name,
            } : null,
            syncGroupId: (it.syncGroupId as string | null) ?? null,
          })),
        })),
        teams: (raw.teams ?? []).map((t: Record<string, unknown>) => ({
          id: t.id as string,
          team: { id: (t.team as Record<string, string>).id, name: (t.team as Record<string, string>).name },
          serviceTimeId: (t.serviceTimeId as string | null) ?? null,
          slots: ((t.slots ?? []) as Record<string, unknown>[]).map((sl) => ({
            id: sl.id as string,
            role: {
              id: ((sl.role as Record<string, unknown>).id) as string,
              name: ((sl.role as Record<string, unknown>).name) as string,
              needed: (((sl.role as Record<string, unknown>).needed) as number) ?? 1,
            },
            user: sl.user ? {
              id: ((sl.user as Record<string, string>).id),
              name: ((sl.user as Record<string, string>).name),
              email: ((sl.user as Record<string, string>).email),
            } : null,
            status: sl.status as string,
            rehearsal: (sl.rehearsal as boolean) ?? false,
            notes: (sl.notes as string | null) ?? null,
          })),
        })),
        scheduleEntries: (raw.scheduleEntries ?? []).map((e: Record<string, unknown>) => ({
          id: e.id as string, label: e.label as string,
          startTime: (e.startTime as string | null) ?? null,
          order: e.order as number,
        })),
      }
      setServices((prev) => [...prev, svc])
      setAddServiceList((prev) => prev.filter((s) => s.id !== serviceId))
      setAddServiceOpen(false)
      setAddServiceSearch("")
      const dateStr = new Date(svc.date).toISOString().split("T")[0]
      if (!availabilityMap.has(dateStr)) {
        fetch(`/api/availability?date=${dateStr}`)
          .then((r) => r.json())
          .then((list: { userId: string }[]) =>
            setAvailabilityMap((prev) => new Map([...prev, [dateStr, new Set(list.map((a) => a.userId))]]))
          )
          .catch(() => {})
      }
      toast.success("Service added to grid")
    } finally {
      setAddingServiceId(null)
    }
  }

  // Active series for the picker
  const activeService = services.find((s) => s.id === activeSeriesServiceId)
  const activeSeriesId = activeService?.seriesId ?? ""

  // ── Layout computations ──────────────────────────────────────────────────────

  // Max number of service times across all services (determines program row count)
  const maxTimes = services.reduce((m, s) => Math.max(m, s.times.length), 0)

  // Ordered list of unique team IDs present in any service (includes time-specific teams)
  const allTeamIds: string[] = []
  const seenTeamIds = new Set<string>()
  for (const svc of services) {
    for (const st of svc.teams) {
      if (!seenTeamIds.has(st.team.id)) {
        seenTeamIds.add(st.team.id)
        allTeamIds.push(st.team.id)
      }
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">

      {/* ── Page title row with Add service button ── */}
      <div className="flex items-center gap-3">
        <Link
          href="/mychurch/services"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          Services
        </Link>
        <span className="text-muted-foreground">/</span>
        <h1 className="text-xl font-bold">{category.name} — Grid</h1>
        <span className="text-sm text-muted-foreground">({services.length} service{services.length !== 1 ? "s" : ""})</span>
        <div className="ml-auto">
          <button
            type="button"
            onClick={openAddService}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md border bg-card hover:bg-accent/50 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add service
          </button>
        </div>
      </div>

    <div className="overflow-x-auto pb-6">
      {/* Hidden file input for artwork uploads */}
      <input
        ref={uploadInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file && uploadTargetSeriesId.current) {
            uploadSeriesImage(uploadTargetSeriesId.current, file)
          }
          e.target.value = ""
        }}
      />

      {/* ── Service grid table ── */}
      <div className="inline-block min-w-max border rounded-lg overflow-hidden">

        {/* ── Header row ── */}
        <div className="flex sticky top-0 z-10 border-b bg-card">
          {services.map((svc, si) => {
            const dateLabel = new Date(svc.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" })
            const currentSeries = seriesList.find((s) => s.id === svc.seriesId) ?? null
            return (
              <div key={svc.id} className={`w-72 shrink-0 px-3 pt-3 pb-2 space-y-2 bg-card${si < services.length - 1 ? " border-r" : ""}`}>
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">{dateLabel}</p>
                    <p className="text-sm font-semibold truncate leading-tight mt-0.5">
                      {svc.title || <span className="text-muted-foreground italic">Untitled</span>}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Link
                      href={`/mychurch/services/${svc.id}`}
                      title="Open full planner"
                      className="h-7 w-7 inline-flex items-center justify-center rounded border bg-card hover:bg-accent/50 text-muted-foreground"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Link>
                    <button
                      type="button"
                      onClick={() => removeService(svc.id)}
                      title="Remove from grid"
                      className="h-7 w-7 inline-flex items-center justify-center rounded border bg-card hover:bg-red-50 hover:border-red-200 text-muted-foreground hover:text-red-500 transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => openSeriesPicker(svc.id)}
                  className="w-full flex items-center gap-2 py-1 px-1.5 rounded hover:bg-accent/50 transition-colors text-left group"
                >
                  {currentSeries?.imageUrl ? (
                    <img src={currentSeries.imageUrl} className="w-6 h-6 rounded object-cover shrink-0" alt={currentSeries.name} />
                  ) : (
                    <div className="w-6 h-6 rounded bg-gradient-to-br from-purple-100 to-purple-200 flex items-center justify-center shrink-0">
                      {currentSeries ? (
                        <span className="text-[10px] font-bold text-purple-400">{currentSeries.name[0]?.toUpperCase()}</span>
                      ) : (
                        <Layers className="h-3 w-3 text-purple-300" />
                      )}
                    </div>
                  )}
                  <span className="text-xs text-muted-foreground truncate flex-1">
                    {currentSeries?.name ?? "No series"}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setTemplateImportOpen((prev) => ({ ...prev, [svc.id]: true }))}
                  className="w-full flex items-center gap-1.5 py-1 px-1.5 rounded text-xs text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-colors"
                >
                  <LayoutTemplate className="h-3.5 w-3.5 shrink-0" />
                  Import Template
                </button>
              </div>
            )
          })}
        </div>

        {/* ── Program Order section label ── */}
        <div className="flex border-b bg-muted/30">
          {services.map((svc, si) => (
            <div key={svc.id} className={`w-72 shrink-0 px-3 py-1.5${si < services.length - 1 ? " border-r" : ""}`}>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Program Order</p>
            </div>
          ))}
        </div>

        {/* ── Program time rows (one per time index, height equalised across all services) ── */}
        {maxTimes === 0 ? (
          <div className="flex border-b">
            {services.map((svc, si) => (
              <div key={svc.id} className={`w-72 shrink-0 px-3 py-3${si < services.length - 1 ? " border-r" : ""}`}>
                <p className="text-xs text-muted-foreground text-center py-1">No service times</p>
              </div>
            ))}
          </div>
        ) : (
          Array.from({ length: maxTimes }).map((_, timeIdx) => (
            <div key={timeIdx} className="flex border-b">
              {services.map((svc, si) => {
                const time = svc.times[timeIdx]
                const isTimeDropTarget = !!time && dragOver?.serviceId === svc.id && dragOver?.timeId === time.id
                return (
                  <div key={svc.id} className={`w-72 shrink-0 px-3 py-2${si < services.length - 1 ? " border-r" : ""}`}>
                    {time ? (
                      <>
                        {svc.times.length > 1 && (
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">
                            {time.label}{time.startTime ? ` · ${time.startTime}` : ""}
                          </p>
                        )}
                        {time.items.map((item) => (
                          <div
                            key={item.id}
                            draggable
                            onDragStart={(e) => handleItemDragStart(e, item, svc.id, time.id)}
                            className="flex items-center gap-1.5 py-1 px-1 rounded cursor-grab hover:bg-accent/50 group/item"
                          >
                            <span className={`text-[10px] px-1 py-0.5 rounded font-medium shrink-0 ${TYPE_COLORS[item.type]}`}>
                              {TYPE_LABELS[item.type]}
                            </span>
                            <span className="text-xs truncate flex-1">
                              {item.type === "SONG"
                                ? (item.song?.title ?? item.name ?? "—")
                                : (item.name ?? <span className="text-muted-foreground italic">—</span>)
                              }
                            </span>
                          </div>
                        ))}
                        <div
                          onDragOver={(e) => handleDragOver(e, svc.id, time.id)}
                          onDragLeave={handleDragLeave}
                          onDrop={(e) => handleDropOnTime(e, svc.id, time.id)}
                          className={`mt-1 h-8 rounded border-2 border-dashed flex items-center justify-center text-[10px] text-muted-foreground transition-colors ${
                            isTimeDropTarget
                              ? "border-primary bg-primary/5 text-primary"
                              : "border-transparent hover:border-muted-foreground/20"
                          }`}
                        >
                          {isTimeDropTarget ? "Drop to copy" : ""}
                        </div>
                      </>
                    ) : null}
                  </div>
                )
              })}
            </div>
          ))
        )}

        {/* ── Teams section label ── */}
        <div className="flex border-b bg-muted/30">
          {services.map((svc, si) => (
            <div key={svc.id} className={`w-72 shrink-0 px-3 py-1.5${si < services.length - 1 ? " border-r" : ""}`}>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Teams</p>
            </div>
          ))}
        </div>

        {/* ── Team rows (one per unique team, height equalised across all services) ── */}
        {allTeamIds.length === 0 && (
          <div className="flex border-b">
            {services.map((svc, si) => (
              <div key={svc.id} className={`w-72 shrink-0 px-3 py-4 text-center${si < services.length - 1 ? " border-r" : ""}`}>
                <p className="text-xs text-muted-foreground">No teams added</p>
                <p className="text-[10px] text-muted-foreground/60 mt-0.5">Use the dropdown below to add a team</p>
              </div>
            ))}
          </div>
        )}
        {allTeamIds.map((teamId) => {
          const teamDef = allTeams.find((t) => t.id === teamId)
          if (!teamDef) return null
          return (
            <div key={teamId} className="flex border-b">
              {services.map((svc, si) => {
                const sts = svc.teams.filter((t) => t.team.id === teamId)
                const st = sts[0] ?? null
                const members = teamDef.members
                return (
                  <div key={svc.id} className={`w-72 shrink-0 px-3 py-2${si < services.length - 1 ? " border-r" : ""}`}>
                    {st ? (
                      <div>
                        <p className="text-xs font-medium mb-2">{st.team.name}</p>
                        {teamDef.roles.map((role) => {
                          const slots = sts.flatMap((s) => s.slots).filter((s) => s.role.id === role.id && s.user !== null)
                          const filledUserIds = slots.map((s) => s.user!.id)
                          const available = members.filter((m) => !filledUserIds.includes(m.user.id))
                          const roleNeeded = neededMap[role.id] ?? role.needed
                          const stillNeeded = Math.max(0, roleNeeded - slots.length)
                          const isRoleDropTarget = dragOver?.serviceId === svc.id && dragOver?.roleId === role.id
                          return (
                            <div key={role.id} className="mb-3 last:mb-0">
                              <div className="group/role flex items-center gap-1 mb-1">
                                <p className="text-[10px] text-muted-foreground">{role.name}</p>
                                <div className="flex items-center gap-0.5 ml-0.5">
                                  <button
                                    type="button"
                                    onClick={() => updateNeeded(role.id, Math.max(0, roleNeeded - 1))}
                                    className="h-3.5 w-3.5 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-accent leading-none opacity-0 group-hover/role:opacity-100 transition-opacity text-[11px]"
                                  >−</button>
                                  <span className="text-[10px] w-3.5 text-center tabular-nums text-muted-foreground/30 group-hover/role:text-muted-foreground transition-colors">{roleNeeded}</span>
                                  <button
                                    type="button"
                                    onClick={() => updateNeeded(role.id, roleNeeded + 1)}
                                    className="h-3.5 w-3.5 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-accent leading-none opacity-0 group-hover/role:opacity-100 transition-opacity text-[11px]"
                                  >+</button>
                                </div>
                                {stillNeeded > 0 && (
                                  <span className="text-[10px] text-orange-600 font-medium ml-0.5">{stillNeeded} needed</span>
                                )}
                              </div>
                              <div
                                onDragOver={(e) => handleDragOver(e, svc.id, undefined, role.id)}
                                onDragLeave={handleDragLeave}
                                onDrop={(e) => handleDropOnRole(e, svc.id, st.id, role.id)}
                                className={`flex flex-wrap gap-1.5 min-h-[2rem] p-1 rounded border-2 border-dashed transition-colors ${
                                  isRoleDropTarget
                                    ? "border-blue-400 bg-blue-50"
                                    : "border-transparent hover:border-muted-foreground/10"
                                }`}
                              >
                                {slots.map((slot) => {
                                  const statusRing = ({
                                    CONFIRMED: "ring-green-400",
                                    DECLINED: "ring-red-400",
                                    PENDING: "ring-yellow-300",
                                  } as Record<string, string>)[slot.status] ?? "ring-yellow-300"
                                  return (
                                    <div
                                      key={slot.id}
                                      draggable
                                      onDragStart={(e) => handleSlotDragStart(e, slot, st, svc.id)}
                                      className="flex flex-col items-center gap-0.5 cursor-grab"
                                      title={slot.user!.name}
                                    >
                                      <div className={`w-7 h-7 rounded-full bg-secondary ring-2 ${statusRing} flex items-center justify-center text-[10px] font-semibold`}>
                                        {getInitials(slot.user!.name)}
                                      </div>
                                      <span className="text-[9px] text-muted-foreground leading-none max-w-[32px] truncate text-center">
                                        {slot.user!.name.split(" ")[0]}
                                      </span>
                                    </div>
                                  )
                                })}
                                {Array.from({ length: stillNeeded }).map((_, i) => (
                                  <button
                                    key={`empty-${i}`}
                                    type="button"
                                    onClick={() => setRolePickerDialog({ role, st, serviceId: svc.id, members })}
                                    title={`Assign ${role.name}`}
                                    className="w-7 h-7 rounded-full border-2 border-dashed border-muted-foreground/30 hover:border-primary hover:bg-primary/5 flex items-center justify-center text-muted-foreground hover:text-primary transition-colors"
                                  >
                                    <Plus className="h-3 w-3" />
                                  </button>
                                ))}
                                {stillNeeded === 0 && available.length > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => setRolePickerDialog({ role, st, serviceId: svc.id, members })}
                                    title={`Add extra ${role.name}`}
                                    className="w-6 h-6 rounded-full border border-dashed border-muted-foreground/20 hover:border-muted-foreground/50 flex items-center justify-center text-muted-foreground/40 hover:text-muted-foreground transition-colors"
                                  >
                                    <Plus className="h-2.5 w-2.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    ) : null}
                  </div>
                )
              })}
            </div>
          )
        })}

        {/* ── Add team row ── */}
        <div className="flex">
          {services.map((svc, si) => {
            const addableTeams = allTeams.filter(
              (t) => !svc.teams.some((st) => st.team.id === t.id)
            )
            return (
              <div key={svc.id} className={`w-72 shrink-0 px-3 py-2${si < services.length - 1 ? " border-r" : ""}`}>
                {addableTeams.length > 0 && (
                  <Select
                    key={`add-team-${svc.id}-${svc.teams.length}`}
                    onValueChange={(teamId) => addTeam(svc.id, teamId)}
                  >
                    <SelectTrigger className="h-7 w-full text-xs border-dashed">
                      <SelectValue placeholder="+ Add team…" />
                    </SelectTrigger>
                    <SelectContent>
                      {addableTeams.map((t) => (
                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )
          })}
        </div>

      </div>

      {/* ── Template import dialogs (per service) ── */}
      {services.map((svc) => (
        <Dialog
          key={svc.id}
          open={!!templateImportOpen[svc.id]}
          onOpenChange={(o) => { if (!o) setTemplateImportOpen((prev) => ({ ...prev, [svc.id]: false })) }}
        >
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Import Template</DialogTitle>
              <p className="text-xs text-muted-foreground pt-0.5">
                {svc.title || new Date(svc.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" })}
              </p>
            </DialogHeader>
            <div className="space-y-3">
              <Select
                value={selectedTemplateId[svc.id] ?? ""}
                onValueChange={(id) => setSelectedTemplateId((prev) => ({ ...prev, [svc.id]: id }))}
              >
                <SelectTrigger><SelectValue placeholder="Choose a template…" /></SelectTrigger>
                <SelectContent>
                  {allTemplates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setTemplateImportOpen((prev) => ({ ...prev, [svc.id]: false }))}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={() => importTemplate(svc.id)}
                  disabled={!selectedTemplateId[svc.id] || !!importing[svc.id]}
                >
                  {importing[svc.id] ? "Importing…" : "Import"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      ))}

      {/* ── Series picker dialog ────────────────────────────────────────────── */}
      <Dialog
        open={activeSeriesServiceId !== null}
        onOpenChange={(o) => { if (!o) setActiveSeriesServiceId(null) }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Series</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-3 gap-3">
            {/* None */}
            <button
              type="button"
              onClick={() => {
                if (activeSeriesServiceId) updateSeries(activeSeriesServiceId, "")
                setActiveSeriesServiceId(null)
              }}
              className={`flex flex-col items-center gap-1.5 p-2 rounded-lg border-2 transition-colors ${
                !activeSeriesId ? "border-primary bg-primary/5" : "border-transparent hover:border-gray-200 hover:bg-accent/50"
              }`}
            >
              <div className="w-full aspect-square rounded-md border-2 border-dashed border-muted-foreground/20 flex items-center justify-center bg-muted/50">
                <X className="h-6 w-6 text-muted-foreground/30" />
              </div>
              <span className="text-xs text-muted-foreground">None</span>
            </button>

            {/* Series cards */}
            {seriesList.map((s) => (
              <div key={s.id} className="relative group/scard">
                <button
                  type="button"
                  onClick={() => {
                    if (activeSeriesServiceId) updateSeries(activeSeriesServiceId, s.id)
                    setActiveSeriesServiceId(null)
                  }}
                  className={`w-full flex flex-col items-center gap-1.5 p-2 rounded-lg border-2 transition-colors ${
                    activeSeriesId === s.id ? "border-primary bg-primary/5" : "border-transparent hover:border-gray-200 hover:bg-accent/50"
                  }`}
                >
                  <div className="w-full aspect-square rounded-md overflow-hidden">
                    {s.imageUrl ? (
                      <img src={s.imageUrl} className="w-full h-full object-cover" alt={s.name} />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-purple-100 to-purple-200 flex items-center justify-center">
                        <span className="text-2xl font-bold text-purple-400">{s.name[0]?.toUpperCase()}</span>
                      </div>
                    )}
                  </div>
                  <span className="text-xs font-medium truncate w-full text-center">{s.name}</span>
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); triggerUpload(s.id) }}
                  title="Upload artwork"
                  className="absolute top-3 right-3 w-6 h-6 rounded-full bg-black/50 text-white flex items-center justify-center opacity-0 group-hover/scard:opacity-100 transition-opacity"
                >
                  <Upload className="h-3 w-3" />
                </button>
              </div>
            ))}

            {/* New series */}
            <button
              type="button"
              onClick={() => { setActiveSeriesServiceId(null); setNewSeriesOpen(true) }}
              className="flex flex-col items-center gap-1.5 p-2 rounded-lg border-2 border-dashed border-muted-foreground/20 hover:border-muted-foreground/40 hover:bg-accent/50 transition-colors"
            >
              <div className="w-full aspect-square rounded-md flex items-center justify-center">
                <Plus className="h-8 w-8 text-muted-foreground/30" />
              </div>
              <span className="text-xs text-muted-foreground">New series</span>
            </button>
          </div>

          {/* Other services in selected series */}
          {activeSeriesId && (() => {
            if (seriesPickerLoading) return (
              <p className="text-xs text-muted-foreground text-center py-2 border-t mt-1 pt-3">Loading services…</p>
            )
            const others = seriesPickerServices.filter(
              (s) => s.seriesId === activeSeriesId && s.id !== activeSeriesServiceId
            )
            if (others.length === 0) return null
            return (
              <div className="border-t pt-3 mt-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Other services in this series</p>
                <div className="space-y-1">
                  {others.map((s) => (
                    <div key={s.id} className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {new Date(s.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })}
                      </span>
                      {s.title && <span className="text-xs font-medium">· {s.title}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )
          })()}
        </DialogContent>
      </Dialog>

      {/* ── New series dialog ───────────────────────────────────────────────── */}
      <Dialog open={newSeriesOpen} onOpenChange={(o) => { if (!o) setNewSeriesOpen(false) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>New Series</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Series name"
              value={newSeriesName}
              onChange={(e) => setNewSeriesName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") createSeries() }}
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setNewSeriesOpen(false)}>Cancel</Button>
              <Button size="sm" onClick={createSeries} disabled={!newSeriesName.trim()}>Create</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Role picker dialog ──────────────────────────────────────────────── */}
      <Dialog open={!!rolePickerDialog} onOpenChange={(o) => { if (!o) closeRolePicker() }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Assign {rolePickerDialog?.role.name}</DialogTitle>
            {rolePickerDialog && (() => {
              const svc = services.find((s) => s.id === rolePickerDialog.serviceId)
              return svc ? (
                <p className="text-xs text-muted-foreground pt-0.5">
                  {new Date(svc.date).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" })}
                </p>
              ) : null
            })()}
          </DialogHeader>

          {pendingConflict ? (
            <div className="space-y-4 pt-1">
              <div className="flex gap-3 p-3 rounded-lg bg-orange-50 border border-orange-200">
                <AlertTriangle className="h-4 w-4 text-orange-500 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-orange-800">Scheduling conflict</p>
                  <p className="text-xs text-orange-700 mt-0.5">
                    {pendingConflict.user.name} is already assigned to:
                  </p>
                  <ul className="text-xs text-orange-700 mt-1 space-y-0.5">
                    {pendingConflict.conflicts.map((c, i) => (
                      <li key={i}>· {c.roleName} in {c.teamName}</li>
                    ))}
                  </ul>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => setPendingConflict(null)}>
                  Cancel
                </Button>
                <Button size="sm" className="flex-1" onClick={async () => {
                  if (!rolePickerDialog) return
                  await addSlot(rolePickerDialog.serviceId, rolePickerDialog.st.id, rolePickerDialog.role.id, pendingConflict.user.id)
                  closeRolePicker()
                }}>
                  Assign Anyway
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-1 max-h-80 overflow-y-auto -mx-1 px-1">
              {(() => {
                if (!rolePickerDialog) return null
                const { role, st, serviceId, members } = rolePickerDialog
                const svc = services.find((s) => s.id === serviceId)
                if (!svc) return null
                const currentSt = svc.teams.find((t) => t.id === st.id)
                const filledIds = currentSt?.slots.filter((s) => s.role.id === role.id && s.user !== null).map((s) => s.user!.id) ?? []
                const options = members.filter((m) => !filledIds.includes(m.user.id))
                const dateStr = new Date(svc.date).toISOString().split("T")[0]
                const blockedIds = availabilityMap.get(dateStr) ?? new Set<string>()

                if (options.length === 0) {
                  return <p className="text-sm text-muted-foreground text-center py-6">No more members available.</p>
                }
                return options.map(({ user }) => {
                  const blocked = blockedIds.has(user.id)
                  const existingAssignments = svc.teams.flatMap((t) =>
                    t.slots
                      .filter((s) => s.user?.id === user.id)
                      .map((s) => ({ roleName: s.role.name, teamName: t.team.name }))
                  )
                  const hasConflict = existingAssignments.length > 0
                  return (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => {
                        if (hasConflict) {
                          setPendingConflict({ user, conflicts: existingAssignments })
                        } else {
                          addSlot(serviceId, st.id, role.id, user.id)
                          closeRolePicker()
                        }
                      }}
                      disabled={blocked}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                        blocked
                          ? "opacity-60 cursor-not-allowed bg-muted/50"
                          : "hover:bg-accent/50 hover:ring-1 hover:ring-gray-200"
                      }`}
                    >
                      <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-sm font-semibold shrink-0">
                        {getInitials(user.name)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{user.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                      </div>
                      <span className={`text-xs font-medium shrink-0 ${blocked ? "text-orange-500" : hasConflict ? "text-yellow-600" : "text-green-600"}`}>
                        {blocked ? "Unavailable" : hasConflict ? "Conflict" : "Available"}
                      </span>
                    </button>
                  )
                })
              })()}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Add service dialog ── */}
      <Dialog open={addServiceOpen} onOpenChange={(o) => { if (!o) { setAddServiceOpen(false); setAddServiceSearch("") } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Service to Grid</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search services…"
                value={addServiceSearch}
                onChange={(e) => setAddServiceSearch(e.target.value)}
                className="pl-8 h-8 text-sm"
                autoFocus
              />
            </div>
            {addServiceLoading ? (
              <p className="text-sm text-muted-foreground text-center py-6">Loading services…</p>
            ) : (
              <div className="max-h-80 overflow-y-auto space-y-1 -mx-1 px-1">
                {(() => {
                  const filtered = addServiceList.filter((s) => {
                    const q = addServiceSearch.toLowerCase()
                    return !q || s.title.toLowerCase().includes(q) ||
                      (s.categoryName ?? "").toLowerCase().includes(q) ||
                      new Date(s.date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" }).toLowerCase().includes(q)
                  })
                  if (filtered.length === 0) {
                    return <p className="text-sm text-muted-foreground text-center py-6">No services found</p>
                  }
                  return filtered.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => handleAddService(s.id)}
                      disabled={addingServiceId === s.id}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left hover:bg-accent/50 transition-colors disabled:opacity-60"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{s.title || <span className="text-muted-foreground italic">Untitled</span>}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {new Date(s.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })}
                          {s.categoryName && <span className="ml-1.5">· {s.categoryName}</span>}
                        </p>
                      </div>
                      {addingServiceId === s.id
                        ? <span className="text-xs text-muted-foreground shrink-0">Adding…</span>
                        : <Plus className="h-4 w-4 text-muted-foreground shrink-0" />
                      }
                    </button>
                  ))
                })()}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
    </div>
  )
}

// (ServiceColumn removed — rendering is now inlined as row-based grid)
