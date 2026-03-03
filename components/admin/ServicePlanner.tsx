"use client"

import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { Trash2, GripVertical, Plus, BookOpen, Users, Search, Check, X, ChevronDown, Pencil, Link2, Clock, Mail, MoreHorizontal, ChevronLeft, ChevronRight, AlertTriangle, LayoutTemplate } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

type ProgramItemType = "SONG" | "SERMON" | "PRAYER" | "ITEM" | "HEADER"

interface User { id: string; name: string; email: string }
interface Role { id: string; name: string; needed: number }
interface Slot { id: string; role: Role; user: User | null; status: string; rehearsal: boolean; notes: string | null }
interface ServiceTeam { id: string; team: { id: string; name: string }; serviceTimeId: string | null; slots: Slot[] }
interface Series { id: string; name: string }
interface Template { id: string; name: string; description: string | null }
interface Arrangement { id: string; name: string }
interface SongBasic { id: string; title: string; author: string | null }
interface SongWithArrangements extends SongBasic { arrangements: Arrangement[] }
interface ProgramItem {
  id: string
  type: ProgramItemType
  order: number
  name: string | null
  notes: string | null
  sermonPassage: string | null
  song: SongBasic | null
  arrangement: Arrangement | null
  syncGroupId: string | null
}
interface LinkItem { id: string; type: string; name: string | null; notes: string | null; songId: string | null; arrangementId: string | null; syncGroupId: string | null; song: { id: string; title: string } | null }
interface LinkTime { id: string; label: string; items: LinkItem[] }
interface LinkService { id: string; title: string; date: string; times: LinkTime[] }
interface ServiceTime {
  id: string
  label: string
  startTime: string | null
  order: number
  items: ProgramItem[]
}
interface ServiceScheduleEntry {
  id: string
  label: string
  startTime: string | null
  order: number
}
interface Team { id: string; name: string; roles: Role[]; members: { user: User }[] }
export interface ServicePlannerService {
  id: string
  title: string
  date: Date
  notes: string | null
  seriesId: string | null
  series: Series | null
  times: ServiceTime[]
  teams: ServiceTeam[]
  scheduleEntries: ServiceScheduleEntry[]
}

interface Props {
  service: ServicePlannerService
  allSongs: SongWithArrangements[]
  allTeams: Team[]
  allSeries: Series[]
  allTemplates: Template[]
  prevId: string | null
  nextId: string | null
}

const TYPE_LABELS: Record<ProgramItemType, string> = {
  SONG: "Song",
  SERMON: "Sermon",
  PRAYER: "Prayer",
  ITEM: "Item",
  HEADER: "Header",
}

const TYPE_COLORS: Record<ProgramItemType, string> = {
  SONG: "bg-blue-100 text-blue-700",
  SERMON: "bg-purple-100 text-purple-700",
  PRAYER: "bg-green-100 text-green-700",
  ITEM: "bg-gray-100 text-gray-700",
  HEADER: "bg-gray-200 text-gray-600",
}

export default function ServicePlanner({ service: init, allSongs, allTeams, allSeries, allTemplates, prevId, nextId }: Props) {
  // ── Series + blockout state ───────────────────────────────────────────────────
  const [seriesId, setSeriesId] = useState(init.seriesId ?? "")
  const [seriesList, setSeriesList] = useState<Series[]>(allSeries)
  const [newSeriesOpen, setNewSeriesOpen] = useState(false)
  const [newSeriesName, setNewSeriesName] = useState("")
  const [deleteServiceOpen, setDeleteServiceOpen] = useState(false)
  const [deletingService, setDeletingService] = useState(false)
  const [importTemplateOpen, setImportTemplateOpen] = useState(false)
  const [selectedTemplateId, setSelectedTemplateId] = useState("")
  const [importing, setImporting] = useState(false)
  const [blockedUserIds, setBlockedUserIds] = useState<Set<string>>(new Set())
  const [neededMap, setNeededMap] = useState<Record<string, number>>(() => {
    const m: Record<string, number> = {}
    allTeams.forEach((t) => t.roles.forEach((r) => { m[r.id] = r.needed }))
    return m
  })

  useEffect(() => {
    const dateStr = new Date(init.date).toISOString().split("T")[0]
    fetch(`/api/availability?date=${dateStr}`)
      .then((r) => r.json())
      .then((list: { userId: string }[]) => setBlockedUserIds(new Set(list.map((a) => a.userId))))
      .catch(() => {})
  }, [init.date])

  async function updateSeries(newSeriesId: string) {
    setSeriesId(newSeriesId)
    await fetch(`/api/services/${init.id}`, {
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
    updateSeries(created.id)
    toast.success(`Series "${created.name}" created`)
  }

  async function deleteService() {
    setDeletingService(true)
    const res = await fetch(`/api/services/${init.id}`, { method: "DELETE" })
    setDeletingService(false)
    if (!res.ok) { toast.error("Failed to delete service"); return }
    window.location.href = "/admin/services"
  }

  async function importTemplate() {
    if (!selectedTemplateId) return
    setImporting(true)
    const res = await fetch(`/api/templates/${selectedTemplateId}/apply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ serviceId: init.id }),
    })
    setImporting(false)
    if (!res.ok) { toast.error("Failed to import template"); return }
    toast.success("Template imported")
    setImportTemplateOpen(false)
    setSelectedTemplateId("")
    window.location.reload()
  }

  // ── Service times state ──────────────────────────────────────────────────────
  const [times, setTimes] = useState(init.times)
  const [collapsedTimes, setCollapsedTimes] = useState<Record<string, boolean>>({})
  const [renamingTimeId, setRenamingTimeId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState("")

  function toggleCollapsed(timeId: string) {
    setCollapsedTimes((prev) => ({ ...prev, [timeId]: !prev[timeId] }))
  }

  async function addTime() {
    const res = await fetch(`/api/services/${init.id}/times`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: `Service ${times.length + 1}` }),
    })
    if (res.ok) {
      const time = await res.json()
      setTimes((prev) => [...prev, time])
      toast.success("Service time added")
    }
  }

  async function renameTime(timeId: string, label: string) {
    if (!label.trim()) return
    const res = await fetch(`/api/services/${init.id}/times/${timeId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: label.trim() }),
    })
    if (res.ok) {
      setTimes((prev) => prev.map((t) => (t.id === timeId ? { ...t, label: label.trim() } : t)))
      setRenamingTimeId(null)
    }
  }

  async function deleteTime(timeId: string) {
    if (times.length <= 1) return
    if (!confirm("Delete this service time and all its items?")) return
    const res = await fetch(`/api/services/${init.id}/times/${timeId}`, { method: "DELETE" })
    if (res.ok) {
      setTimes(times.filter((t) => t.id !== timeId))
      toast.success("Service time deleted")
    } else {
      toast.error("Cannot delete the only service time")
    }
  }

  // ── Teams state ──────────────────────────────────────────────────────────────
  const [teams, setTeams] = useState(init.teams)
  const [scheduleOpen, setScheduleOpen] = useState(true)
  const [teamsOpenByTimeId, setTeamsOpenByTimeId] = useState<Record<string, boolean>>({})

  // ── Slot dialog state ─────────────────────────────────────────────────────────
  const [slotDialog, setSlotDialog] = useState<{ slot: Slot; roleName: string; teamName: string; teamId: string } | null>(null)
  const [dialogStatus, setDialogStatus] = useState("PENDING")
  const [dialogRehearsal, setDialogRehearsal] = useState(false)
  const [dialogNotes, setDialogNotes] = useState("")
  const [dialogSaving, setDialogSaving] = useState(false)

  function openSlotDialog(slot: Slot, roleName: string, st: ServiceTeam) {
    setSlotDialog({ slot, roleName, teamName: st.team.name, teamId: st.team.id })
    setDialogStatus(slot.status)
    setDialogRehearsal(slot.rehearsal)
    setDialogNotes(slot.notes ?? "")
  }

  async function saveSlotDialog() {
    if (!slotDialog) return
    setDialogSaving(true)
    try {
      const res = await fetch(`/api/slots/${slotDialog.slot.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: dialogStatus, rehearsal: dialogRehearsal, notes: dialogNotes }),
      })
      if (res.ok) {
        const updated = await res.json()
        setTeams((prev) => prev.map((t) => ({
          ...t,
          slots: t.slots.map((sl) => (sl.id === slotDialog.slot.id ? updated : sl)),
        })))
        setSlotDialog(null)
        toast.success("Saved")
      } else {
        const err = await res.json().catch(() => ({}))
        toast.error(err?.error ?? "Failed to save")
        console.error("saveSlotDialog failed", res.status, err)
      }
    } catch (e) {
      toast.error("Network error")
      console.error(e)
    } finally {
      setDialogSaving(false)
    }
  }

  // ── Schedule state ───────────────────────────────────────────────────────────
  const [scheduleEntries, setScheduleEntries] = useState(init.scheduleEntries)
  const [editingTimeStartId, setEditingTimeStartId] = useState<string | null>(null)
  const [editTimeStartValue, setEditTimeStartValue] = useState("")
  const [editingScheduleId, setEditingScheduleId] = useState<string | null>(null)
  const [editScheduleLabel, setEditScheduleLabel] = useState("")
  const [editScheduleTime, setEditScheduleTime] = useState("")
  const [addingScheduleEntry, setAddingScheduleEntry] = useState(false)
  const [newScheduleLabel, setNewScheduleLabel] = useState("")
  const [newScheduleTime, setNewScheduleTime] = useState("")

  async function saveTimeStart(timeId: string) {
    await fetch(`/api/services/${init.id}/times/${timeId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ startTime: editTimeStartValue }),
    })
    setTimes((prev) => prev.map((t) => (t.id === timeId ? { ...t, startTime: editTimeStartValue || null } : t)))
    setEditingTimeStartId(null)
  }

  async function addScheduleEntry() {
    if (!newScheduleLabel.trim()) return
    const res = await fetch(`/api/services/${init.id}/schedule`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: newScheduleLabel.trim(), startTime: newScheduleTime || null, order: scheduleEntries.length }),
    })
    if (res.ok) {
      const entry = await res.json()
      setScheduleEntries((prev) => [...prev, entry])
      setNewScheduleLabel("")
      setNewScheduleTime("")
      setAddingScheduleEntry(false)
    }
  }

  async function saveScheduleEntry(id: string) {
    await fetch(`/api/services/${init.id}/schedule/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: editScheduleLabel.trim(), startTime: editScheduleTime || null }),
    })
    setScheduleEntries((prev) => prev.map((e) => e.id === id ? { ...e, label: editScheduleLabel.trim(), startTime: editScheduleTime || null } : e))
    setEditingScheduleId(null)
  }

  async function deleteScheduleEntry(id: string) {
    await fetch(`/api/services/${init.id}/schedule/${id}`, { method: "DELETE" })
    setScheduleEntries((prev) => prev.filter((e) => e.id !== id))
  }

  // ── Add item form state ──────────────────────────────────────────────────────
  const [addingItemForTimeId, setAddingItemForTimeId] = useState<string | null>(null)
  const [itemType, setItemType] = useState<ProgramItemType | "SYNCED">("SONG")
  const [songSearch, setSongSearch] = useState("")
  const [selectedSongId, setSelectedSongId] = useState("")
  const [selectedArrId, setSelectedArrId] = useState("")
  const [itemName, setItemName] = useState("")
  const [itemNotes, setItemNotes] = useState("")
  const [itemSermonPassage, setItemSermonPassage] = useState("")
  const [addLinkLoading, setAddLinkLoading] = useState(false)
  const [addLinkServiceId, setAddLinkServiceId] = useState("")
  const [addLinkItemId, setAddLinkItemId] = useState("")

  // ── Drag state ───────────────────────────────────────────────────────────────
  const [dragging, setDragging] = useState<number | null>(null)
  const [draggingInTimeId, setDraggingInTimeId] = useState<string | null>(null)

  // ── Hover state for trash icon ───────────────────────────────────────────────
  const [hoveredItemId, setHoveredItemId] = useState<string | null>(null)

  // ── Inline item editing ──────────────────────────────────────────────────────
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState("")
  const [editNotes, setEditNotes] = useState("")
  const [editArrId, setEditArrId] = useState("")
  const [editSermonPassage, setEditSermonPassage] = useState("")
  const [editSaving, setEditSaving] = useState(false)

  // ── Link panel (sync across services) ───────────────────────────────────────
  const [showLinkPanel, setShowLinkPanel] = useState(false)
  const [linkLoading, setLinkLoading] = useState(false)
  const [linkServices, setLinkServices] = useState<LinkService[]>([])
  const [linkServiceId, setLinkServiceId] = useState("")
  const [linkItemId, setLinkItemId] = useState("")

  // ── Service title editing ────────────────────────────────────────────────────
  const [serviceTitle, setServiceTitle] = useState(init.title)
  const [editingTitle, setEditingTitle] = useState(false)
  const [editTitleValue, setEditTitleValue] = useState(init.title)
  const [savingTitle, setSavingTitle] = useState(false)
  const [hoveringTitle, setHoveringTitle] = useState(false)

  async function saveTitle() {
    if (!editTitleValue.trim()) return
    setSavingTitle(true)
    const res = await fetch(`/api/services/${init.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: editTitleValue.trim() }),
    })
    setSavingTitle(false)
    if (res.ok) {
      setServiceTitle(editTitleValue.trim())
      setEditingTitle(false)
      toast.success("Title updated")
    } else {
      toast.error("Failed to update title")
    }
  }

  // ── Item helpers ─────────────────────────────────────────────────────────────
  function startEdit(item: ProgramItem) {
    setEditingId(item.id)
    setEditName(item.name ?? "")
    setEditNotes(item.notes ?? "")
    setEditSermonPassage(item.sermonPassage ?? "")
    setEditArrId(item.arrangement?.id ?? "")
  }

  function cancelEdit() {
    setEditingId(null)
    setShowLinkPanel(false)
    setLinkServiceId("")
    setLinkItemId("")
  }

  async function saveEdit(item: ProgramItem) {
    setEditSaving(true)
    const res = await fetch(`/api/services/${init.id}/items/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: (item.type === "SERMON" || item.type === "ITEM" || item.type === "HEADER") ? (editName || null) : undefined,
        notes: item.type !== "HEADER" ? (editNotes || null) : undefined,
        ...(item.type === "SERMON" ? { sermonPassage: editSermonPassage || null } : {}),
        ...(item.type === "SONG" && editArrId ? { arrangementId: editArrId } : {}),
      }),
    })
    setEditSaving(false)
    if (res.ok) {
      const updated = await res.json()
      setTimes((prev) =>
        prev.map((t) => ({
          ...t,
          items: t.items.map((it) => {
            if (it.id === item.id) return { ...it, ...updated }
            if (updated.syncGroupId && it.syncGroupId === updated.syncGroupId) {
              return {
                ...it,
                notes: updated.notes,
                ...(updated.name !== undefined && { name: updated.name }),
                ...(updated.sermonPassage !== undefined && { sermonPassage: updated.sermonPassage }),
                ...(updated.arrangement && { arrangementId: updated.arrangementId, arrangement: updated.arrangement }),
              }
            }
            return it
          }),
        }))
      )
      setEditingId(null)
      toast.success(updated.syncGroupId ? "Item updated and synced" : "Item updated")
    } else {
      toast.error("Failed to update item")
    }
  }

  async function openLinkPanel() {
    setShowLinkPanel(true)
    setLinkServiceId("")
    setLinkItemId("")
    if (linkServices.length > 0) return
    setLinkLoading(true)
    const res = await fetch("/api/services")
    const all = await res.json()
    setLinkServices(all)
    setLinkLoading(false)
  }

  async function doLink(item: ProgramItem) {
    if (!linkItemId) return
    const res = await fetch("/api/sync-items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId: item.id, pairItemId: linkItemId }),
    })
    if (res.ok) {
      const { syncGroupId } = await res.json()
      setTimes((prev) =>
        prev.map((t) => ({
          ...t,
          items: t.items.map((it) => (it.id === item.id ? { ...it, syncGroupId } : it)),
        }))
      )
      setShowLinkPanel(false)
      setLinkServiceId("")
      setLinkItemId("")
      toast.success("Item linked — edits will sync")
    } else {
      toast.error("Failed to link item")
    }
  }

  async function unlinkItem(item: ProgramItem) {
    const res = await fetch(`/api/sync-items/${item.id}`, { method: "DELETE" })
    if (res.ok) {
      setTimes((prev) =>
        prev.map((t) => ({
          ...t,
          items: t.items.map((it) => (it.id === item.id ? { ...it, syncGroupId: null } : it)),
        }))
      )
      toast.success("Item unlinked")
    }
  }

  const filteredSongs = allSongs.filter((s) => {
    const q = songSearch.toLowerCase()
    return s.title.toLowerCase().includes(q) || (s.author?.toLowerCase().includes(q) ?? false)
  })

  const selectedSong = allSongs.find((s) => s.id === selectedSongId)

  function resetAddForm() {
    setItemType("SONG")
    setSongSearch("")
    setSelectedSongId("")
    setSelectedArrId("")
    setItemName("")
    setItemNotes("")
    setItemSermonPassage("")
    setAddLinkServiceId("")
    setAddLinkItemId("")
    setAddingItemForTimeId(null)
  }

  async function selectSyncedType() {
    setItemType("SYNCED")
    if (linkServices.length > 0) return
    setAddLinkLoading(true)
    const res = await fetch("/api/services")
    const all = await res.json()
    setLinkServices(all)
    setAddLinkLoading(false)
  }

  async function addItem(timeId: string) {
    if (itemType === "SYNCED") {
      if (!addLinkItemId) { toast.error("Select an item to sync with"); return }
      const src = linkServices.flatMap((s) => s.times.flatMap((t) => t.items)).find((it) => it.id === addLinkItemId)
      if (!src) return
      const timeItems = times.find((t) => t.id === timeId)?.items ?? []
      const createRes = await fetch(`/api/services/${init.id}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceTimeId: timeId,
          type: src.type,
          order: timeItems.length,
          name: src.name || null,
          notes: src.notes || null,
          ...(src.type === "SONG" && src.songId ? { songId: src.songId, arrangementId: src.arrangementId } : {}),
        }),
      })
      if (!createRes.ok) { toast.error("Failed to add item"); return }
      const newItem = await createRes.json()
      const linkRes = await fetch("/api/sync-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId: newItem.id, pairItemId: addLinkItemId }),
      })
      if (linkRes.ok) {
        const { syncGroupId } = await linkRes.json()
        setTimes((prev) =>
          prev.map((t) => (t.id === timeId ? { ...t, items: [...t.items, { ...newItem, syncGroupId }] } : t))
        )
        resetAddForm()
        toast.success("Synced item added")
      } else {
        toast.error("Item created but linking failed")
      }
      return
    }

    if (itemType === "SONG" && (!selectedSongId || !selectedArrId)) {
      toast.error("Select a song and arrangement")
      return
    }
    const timeItems = times.find((t) => t.id === timeId)?.items ?? []
    const res = await fetch(`/api/services/${init.id}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        serviceTimeId: timeId,
        type: itemType,
        order: timeItems.length,
        name: (itemType === "ITEM" || itemType === "SERMON" || itemType === "HEADER") ? (itemName || null) : null,
        notes: itemType !== "HEADER" ? (itemNotes || null) : null,
        ...(itemType === "SERMON" ? { sermonPassage: itemSermonPassage || null } : {}),
        ...(itemType === "SONG" && { songId: selectedSongId, arrangementId: selectedArrId }),
      }),
    })
    if (res.ok) {
      const item = await res.json()
      setTimes((prev) =>
        prev.map((t) => (t.id === timeId ? { ...t, items: [...t.items, item] } : t))
      )
      resetAddForm()
      toast.success("Item added")
    } else {
      const err = await res.json().catch(() => ({}))
      toast.error(err.error || "Failed to add item")
    }
  }

  async function removeItem(itemId: string) {
    await fetch(`/api/services/${init.id}/items/${itemId}`, { method: "DELETE" })
    setTimes((prev) =>
      prev.map((t) => ({ ...t, items: t.items.filter((item) => item.id !== itemId) }))
    )
  }

  // ── Teams helpers ────────────────────────────────────────────────────────────
  async function addTeam(teamId: string, serviceTimeId: string | null) {
    if (teams.some((t) => t.team.id === teamId && t.serviceTimeId === serviceTimeId)) {
      toast.error("Team already added to this section"); return
    }
    const res = await fetch(`/api/services/${init.id}/teams`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teamId, serviceTimeId }),
    })
    if (res.ok) {
      const st = await res.json()
      setTeams((prev) => [...prev, st])
      toast.success("Team added")
    } else {
      const err = await res.json().catch(() => ({}))
      toast.error(err?.error ?? "Failed to add team")
      console.error("addTeam failed", res.status, err)
    }
  }

  async function deleteTeam(serviceTeamId: string) {
    if (!confirm("Remove this team from the service?")) return
    const res = await fetch(`/api/services/${init.id}/teams/${serviceTeamId}`, { method: "DELETE" })
    if (res.ok) {
      setTeams(teams.filter((t) => t.id !== serviceTeamId))
      toast.success("Team removed")
    }
  }

  async function updateNeeded(roleId: string, needed: number) {
    await fetch(`/api/roles/${roleId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ needed }),
    })
    setNeededMap((prev) => ({ ...prev, [roleId]: needed }))
  }

  function cycleStatus(current: string) {
    if (current === "PENDING") return "CONFIRMED"
    if (current === "CONFIRMED") return "DECLINED"
    return "PENDING"
  }

  async function updateSlotStatus(slotId: string, status: string) {
    const res = await fetch(`/api/slots/${slotId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    })
    if (res.ok) {
      const updated = await res.json()
      setTeams(teams.map((t) => ({
        ...t,
        slots: t.slots.map((sl) => (sl.id === slotId ? { ...sl, status: updated.status } : sl)),
      })))
    }
  }

  async function removeSlot(slotId: string) {
    const res = await fetch(`/api/slots/${slotId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: null }),
    })
    if (res.ok) {
      const updated = await res.json()
      setTeams(teams.map((t) => ({
        ...t,
        slots: t.slots.map((sl) => (sl.id === slotId ? updated : sl)),
      })))
    }
  }

  async function addSlot(serviceTeamId: string, roleId: string, userId: string) {
    const res = await fetch("/api/slots", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ serviceTeamId, roleId, userId }),
    })
    if (res.ok) {
      const slot = await res.json()
      setTeams(teams.map((t) => {
        if (t.id !== serviceTeamId) return t
        const idx = t.slots.findIndex((s) => s.id === slot.id)
        if (idx >= 0) {
          const updated = [...t.slots]
          updated[idx] = slot
          return { ...t, slots: updated }
        }
        return { ...t, slots: [...t.slots, slot] }
      }))
    }
  }

  // ── Drag-and-drop ────────────────────────────────────────────────────────────
  function handleDragStart(i: number, timeId: string) {
    setDragging(i)
    setDraggingInTimeId(timeId)
  }
  function handleDragOver(e: React.DragEvent, i: number, timeId: string) {
    e.preventDefault()
    if (dragging === null || dragging === i || draggingInTimeId !== timeId) return
    setTimes((prev) =>
      prev.map((t) => {
        if (t.id !== timeId) return t
        const reordered = [...t.items]
        const [moved] = reordered.splice(dragging, 1)
        reordered.splice(i, 0, moved)
        return { ...t, items: reordered.map((item, idx) => ({ ...item, order: idx })) }
      })
    )
    setDragging(i)
  }
  async function handleDragEnd(timeId: string) {
    const timeItems = times.find((t) => t.id === timeId)?.items ?? []
    setDragging(null)
    setDraggingInTimeId(null)
    await fetch(`/api/services/${init.id}/items`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: timeItems.map((item) => ({ id: item.id, order: item.order })) }),
    })
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* ── Page header ──────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2 min-w-0">
          {/* Prev / Next navigation */}
          <div className="flex gap-1 mt-0.5 shrink-0">
            {prevId ? (
              <Link href={`/admin/services/${prevId}`} className="inline-flex items-center justify-center h-8 w-8 rounded border bg-white hover:bg-gray-50 text-muted-foreground">
                <ChevronLeft className="h-4 w-4" />
              </Link>
            ) : (
              <span className="inline-flex items-center justify-center h-8 w-8 rounded border bg-white text-muted-foreground/30">
                <ChevronLeft className="h-4 w-4" />
              </span>
            )}
            {nextId ? (
              <Link href={`/admin/services/${nextId}`} className="inline-flex items-center justify-center h-8 w-8 rounded border bg-white hover:bg-gray-50 text-muted-foreground">
                <ChevronRight className="h-4 w-4" />
              </Link>
            ) : (
              <span className="inline-flex items-center justify-center h-8 w-8 rounded border bg-white text-muted-foreground/30">
                <ChevronRight className="h-4 w-4" />
              </span>
            )}
          </div>

          {/* Title + date + series */}
          <div className="min-w-0">
            {editingTitle ? (
              <div className="flex items-center gap-2 mb-0.5">
                <Input
                  className="h-8 text-lg font-bold w-72"
                  value={editTitleValue}
                  onChange={(e) => setEditTitleValue(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") saveTitle(); if (e.key === "Escape") setEditingTitle(false) }}
                  autoFocus
                />
                <button type="button" onClick={saveTitle} disabled={savingTitle} className="text-green-600 hover:text-green-700">
                  <Check className="h-4 w-4" />
                </button>
                <button type="button" onClick={() => setEditingTitle(false)} className="text-muted-foreground hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="flex items-center gap-1.5 text-left group"
                onClick={() => { setEditTitleValue(serviceTitle); setEditingTitle(true) }}
              >
                <h1 className="text-2xl font-bold leading-tight">{serviceTitle}</h1>
                <Pencil className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity mt-1" />
              </button>
            )}
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-sm text-muted-foreground">
                {new Date(init.date).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
              </p>
              {/* Series selector */}
              <Select value={seriesId || "__none__"} onValueChange={(v) => {
                if (v === "__new__") { setNewSeriesOpen(true); return }
                updateSeries(v === "__none__" ? "" : v)
              }}>
                <SelectTrigger className="h-6 text-xs border-dashed w-40 px-2">
                  <SelectValue placeholder="No series" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No series</SelectItem>
                  {seriesList.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                  <SelectItem value="__new__">
                    <span className="flex items-center gap-1 text-muted-foreground"><Plus className="h-3 w-3" /> New series…</span>
                  </SelectItem>
                </SelectContent>
              </Select>

              <Dialog open={newSeriesOpen} onOpenChange={setNewSeriesOpen}>
                <DialogContent className="max-w-sm">
                  <DialogHeader>
                    <DialogTitle>New Series</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3">
                    <Input
                      placeholder="Series name"
                      value={newSeriesName}
                      onChange={(e) => setNewSeriesName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && createSeries()}
                      autoFocus
                    />
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => setNewSeriesOpen(false)}>Cancel</Button>
                      <Button size="sm" onClick={createSeries} disabled={!newSeriesName.trim()}>Create</Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" asChild>
            <Link href={`/admin/songbook?serviceId=${init.id}`}>
              <BookOpen className="h-4 w-4 mr-1" /> Open Songbook
            </Link>
          </Button>
          <Button variant="outline" size="icon" className="text-muted-foreground hover:text-destructive hover:border-destructive" onClick={() => setDeleteServiceOpen(true)} title="Delete service">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

        <Dialog open={deleteServiceOpen} onOpenChange={setDeleteServiceOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive" /> Delete Service
              </DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete{" "}
              <span className="font-medium text-foreground">"{serviceTitle}"</span>?
              All service times, program items, and team assignments will be permanently removed.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setDeleteServiceOpen(false)}>Cancel</Button>
              <Button variant="destructive" size="sm" onClick={deleteService} disabled={deletingService}>
                {deletingService ? "Deleting…" : "Delete"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 grid-cols-[260px_1fr]">
        {/* Left column */}
        <div className="space-y-2">
          {/* ── Schedule section ─────────────────────────────────────────── */}
          <div className="border rounded-lg overflow-hidden bg-white">
            <button
              type="button"
              className="w-full flex items-center justify-between px-3.5 py-2 hover:bg-gray-50 text-left"
              onClick={() => setScheduleOpen(!scheduleOpen)}
            >
              <span className="text-sm font-semibold flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" /> Schedule
              </span>
              <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-150 ${scheduleOpen ? "" : "-rotate-90"}`} />
            </button>
            {scheduleOpen && (
              <div className="border-t px-3.5 pb-3 pt-2 space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide pb-0.5">Service Times</p>
                {times.map((time) => (
                  <div key={time.id}>
                    {editingTimeStartId === time.id ? (
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-medium flex-1 truncate">{time.label}</span>
                        <Input
                          className="h-6 text-xs w-24 px-1.5"
                          value={editTimeStartValue}
                          onChange={(e) => setEditTimeStartValue(e.target.value)}
                          placeholder="10:30 AM"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") saveTimeStart(time.id)
                            if (e.key === "Escape") setEditingTimeStartId(null)
                          }}
                          autoFocus
                        />
                        <button type="button" onClick={() => saveTimeStart(time.id)} className="text-green-600 hover:text-green-700 shrink-0">
                          <Check className="h-3 w-3" />
                        </button>
                        <button type="button" onClick={() => setEditingTimeStartId(null)} className="text-muted-foreground hover:text-foreground shrink-0">
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="w-full flex items-center gap-1 text-left hover:bg-gray-50 rounded px-1 py-0.5"
                        onClick={() => { setEditTimeStartValue(time.startTime || ""); setEditingTimeStartId(time.id) }}
                      >
                        <span className="text-xs font-medium flex-1 truncate">{time.label}</span>
                        <span className="text-xs text-muted-foreground">{time.startTime || "—"}</span>
                      </button>
                    )}
                  </div>
                ))}

                {scheduleEntries.length > 0 && <div className="border-t my-1.5" />}
                {scheduleEntries.length > 0 && (
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide pb-0.5">Additional</p>
                )}
                {scheduleEntries.map((entry) => (
                  <div key={entry.id}>
                    {editingScheduleId === entry.id ? (
                      <div className="space-y-1">
                        <div className="flex items-center gap-1">
                          <Input
                            className="h-6 text-xs flex-1 px-1.5"
                            value={editScheduleLabel}
                            onChange={(e) => setEditScheduleLabel(e.target.value)}
                            placeholder="Label"
                            autoFocus
                          />
                          <button type="button" onClick={() => saveScheduleEntry(entry.id)} className="text-green-600 hover:text-green-700 shrink-0">
                            <Check className="h-3 w-3" />
                          </button>
                          <button type="button" onClick={() => setEditingScheduleId(null)} className="text-muted-foreground hover:text-foreground shrink-0">
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                        <Input
                          className="h-6 text-xs px-1.5"
                          value={editScheduleTime}
                          onChange={(e) => setEditScheduleTime(e.target.value)}
                          placeholder="8:00 AM"
                        />
                      </div>
                    ) : (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          className="flex-1 flex items-center gap-1 text-left hover:bg-gray-50 rounded px-1 py-0.5"
                          onClick={() => { setEditScheduleLabel(entry.label); setEditScheduleTime(entry.startTime || ""); setEditingScheduleId(entry.id) }}
                        >
                          <span className="text-xs flex-1 truncate">{entry.label}</span>
                          <span className="text-xs text-muted-foreground">{entry.startTime || "—"}</span>
                        </button>
                        <button type="button" onClick={() => deleteScheduleEntry(entry.id)} className="text-muted-foreground hover:text-destructive shrink-0">
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}

                {addingScheduleEntry ? (
                  <div className="space-y-1 pt-1">
                    <Input
                      className="h-7 text-xs"
                      placeholder="Label (e.g. Practice Time)"
                      value={newScheduleLabel}
                      onChange={(e) => setNewScheduleLabel(e.target.value)}
                      autoFocus
                    />
                    <div className="flex items-center gap-1">
                      <Input
                        className="h-7 text-xs flex-1"
                        placeholder="Time (e.g. 8:00 AM)"
                        value={newScheduleTime}
                        onChange={(e) => setNewScheduleTime(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") addScheduleEntry() }}
                      />
                      <Button size="sm" className="h-7 px-2 text-xs shrink-0" onClick={addScheduleEntry}>Add</Button>
                      <Button size="sm" variant="outline" className="h-7 px-2 text-xs shrink-0" onClick={() => { setAddingScheduleEntry(false); setNewScheduleLabel(""); setNewScheduleTime("") }}>
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="text-xs flex items-center gap-1 text-muted-foreground hover:text-foreground pt-1"
                    onClick={() => setAddingScheduleEntry(true)}
                  >
                    <Plus className="h-3 w-3" /> Add entry
                  </button>
                )}
              </div>
            )}
          </div>

          {/* ── Teams grouped by service time ────────────────────────────── */}
          {[...times.map((t) => ({ key: t.id, label: t.label })), { key: "general", label: "General" }].map(({ key, label }) => {
            const timeTeams = key === "general"
              ? teams.filter((st) => st.serviceTimeId === null)
              : teams.filter((st) => st.serviceTimeId === key)
            const isOpen = teamsOpenByTimeId[key] !== false
            return (
              <div key={key} className="border rounded-lg overflow-hidden bg-white">
                <button
                  type="button"
                  className="w-full flex items-center justify-between px-3.5 py-2 hover:bg-gray-50 text-left"
                  onClick={() => setTeamsOpenByTimeId((prev) => ({ ...prev, [key]: !isOpen }))}
                >
                  <span className="text-sm font-semibold">
                    {label} <span className="font-normal text-muted-foreground text-xs">teams</span>
                  </span>
                  <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-150 ${isOpen ? "" : "-rotate-90"}`} />
                </button>
                {isOpen && (
                  <div className="border-t px-3.5 py-2.5 space-y-3">
                    {timeTeams.length === 0 && (
                      <p className="text-xs text-muted-foreground">No teams assigned.</p>
                    )}
                    {timeTeams.map((st) => {
                      const teamDef = allTeams.find((t) => t.id === st.team.id)
                      const allRoles = teamDef?.roles ?? []
                      return (
                        <div key={st.id} className="rounded border p-2.5">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-semibold">{st.team.name}</span>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button type="button" className="h-5 w-5 inline-flex items-center justify-center rounded hover:bg-gray-100">
                                  <MoreHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-44">
                                <DropdownMenuItem onSelect={() => {
                                  setNewScheduleLabel(`${st.team.name} Call Time`)
                                  setNewScheduleTime("")
                                  setScheduleOpen(true)
                                  setAddingScheduleEntry(true)
                                }}>
                                  <Clock className="h-3.5 w-3.5 mr-2" /> Add Call Time
                                </DropdownMenuItem>
                                <DropdownMenuItem onSelect={() => {
                                  setNewScheduleLabel(`${st.team.name} Rehearsal`)
                                  setNewScheduleTime("")
                                  setScheduleOpen(true)
                                  setAddingScheduleEntry(true)
                                }}>
                                  <Clock className="h-3.5 w-3.5 mr-2" /> Add Rehearsal
                                </DropdownMenuItem>
                                <DropdownMenuItem onSelect={() => {
                                  const emails = st.slots
                                    .filter((s) => s.user !== null)
                                    .map((s) => s.user!.email)
                                    .filter(Boolean)
                                  if (emails.length === 0) { toast.error("No team members assigned"); return }
                                  window.open(`mailto:${emails.join(",")}?subject=${encodeURIComponent(serviceTitle)}`)
                                }}>
                                  <Mail className="h-3.5 w-3.5 mr-2" /> Email Team
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onSelect={() => deleteTeam(st.id)}
                                >
                                  <Trash2 className="h-3.5 w-3.5 mr-2" /> Remove Team
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>

                          {allRoles.map((role) => {
                            const slots = st.slots.filter((s) => s.role.id === role.id && s.user !== null)
                            const filledUserIds = slots.map((s) => s.user!.id)
                            const members = teamDef?.members ?? []
                            const available = members.filter((m) => !filledUserIds.includes(m.user.id))
                            const roleNeeded = neededMap[role.id] ?? role.needed
                            const stillNeeded = roleNeeded > 0 ? roleNeeded - slots.length : 0
                            return (
                              <div key={role.id} className="mb-1.5">
                                <div className="flex items-center gap-1.5 mb-0.5">
                                  <p className="text-xs text-muted-foreground font-medium">{role.name}</p>
                                  <input
                                    type="number"
                                    min={0}
                                    className="w-7 h-4 text-xs text-center bg-background border rounded px-0.5"
                                    value={neededMap[role.id] ?? role.needed}
                                    title="Needed count"
                                    onChange={(e) => setNeededMap((prev) => ({ ...prev, [role.id]: parseInt(e.target.value) || 0 }))}
                                    onBlur={(e) => updateNeeded(role.id, parseInt(e.target.value) || 0)}
                                  />
                                  {stillNeeded > 0 && (
                                    <span className="text-xs text-orange-600 font-medium">{stillNeeded} needed</span>
                                  )}
                                </div>
                                <div className="flex flex-wrap gap-1 items-center">
                                  {slots.map((slot) => {
                                    const statusMeta = {
                                      CONFIRMED: { label: "✓", color: "bg-green-100 text-green-700" },
                                      DECLINED:  { label: "✗", color: "bg-red-100 text-red-700" },
                                      PENDING:   { label: "?", color: "bg-yellow-50 text-yellow-700 border border-yellow-200" },
                                    }
                                    const meta = statusMeta[slot.status as keyof typeof statusMeta] ?? statusMeta.PENDING
                                    return (
                                      <span key={slot.id} className="inline-flex items-center gap-0.5 text-xs bg-secondary rounded-full pl-2 pr-1 py-0.5 font-medium">
                                        <button
                                          type="button"
                                          className="hover:underline leading-none"
                                          onClick={() => openSlotDialog(slot, role.name, st)}
                                        >
                                          {slot.user!.name}
                                        </button>
                                        <span className={`text-xs rounded px-1 leading-none ${meta.color}`}>{meta.label}</span>
                                        {slot.rehearsal && <span className="text-xs rounded px-1 leading-none bg-blue-50 text-blue-600">R</span>}
                                        <button type="button" onClick={() => removeSlot(slot.id)} className="hover:text-destructive leading-none ml-0.5">
                                          <X className="h-2.5 w-2.5" />
                                        </button>
                                      </span>
                                    )
                                  })}
                                  {available.length > 0 && (
                                    <Select
                                      key={`${st.id}-${role.id}-${slots.length}`}
                                      onValueChange={(userId) => addSlot(st.id, role.id, userId)}
                                    >
                                      <SelectTrigger className="h-6 w-20 text-xs border-dashed px-2">
                                        <SelectValue placeholder="+ Add" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {available.map((m) => {
                                          const isBlocked = blockedUserIds.has(m.user.id)
                                          return (
                                            <SelectItem key={m.user.id} value={m.user.id}>
                                              {m.user.name}{isBlocked ? " (unavailable)" : ""}
                                            </SelectItem>
                                          )
                                        })}
                                      </SelectContent>
                                    </Select>
                                  )}
                                </div>
                              </div>
                            )
                          })}

                          {allRoles.length === 0 && (
                            <p className="text-xs text-muted-foreground">No roles defined for this team.</p>
                          )}
                        </div>
                      )
                    })}

                    {(() => {
                      const availableTeams = allTeams.filter((t) =>
                        !teams.some((st) =>
                          st.team.id === t.id &&
                          (key === "general" ? st.serviceTimeId === null : st.serviceTimeId === key)
                        )
                      )
                      return availableTeams.length > 0 ? (
                        <Select key={`add-team-${key}-${teams.length}`} onValueChange={(teamId) => addTeam(teamId, key === "general" ? null : key)}>
                          <SelectTrigger className="h-7 w-full text-xs border-dashed">
                            <SelectValue placeholder="+ Add team…" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableTeams.map((t) => (
                              <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : null
                    })()}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Program Order — RIGHT */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between py-3 gap-2">
            <CardTitle className="text-base">Program Order</CardTitle>
            <div className="flex items-center gap-2 shrink-0">
              {allTemplates.length > 0 && (
                <Button size="sm" variant="outline" onClick={() => { setSelectedTemplateId(""); setImportTemplateOpen(true) }}>
                  <LayoutTemplate className="h-4 w-4 mr-1" /> Import Template
                </Button>
              )}
              <Button size="sm" variant="outline" onClick={addTime}>
                <Plus className="h-4 w-4 mr-1" /> Add Time
              </Button>
            </div>
          </CardHeader>

          {/* Import template dialog */}
          <Dialog open={importTemplateOpen} onOpenChange={setImportTemplateOpen}>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle>Import Template</DialogTitle>
              </DialogHeader>
              <p className="text-sm text-muted-foreground">
                Select a template to add its service times, program items, and teams to this service plan.
              </p>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {allTemplates.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setSelectedTemplateId(t.id)}
                    className={[
                      "w-full text-left px-3 py-2.5 rounded-lg border transition-colors",
                      selectedTemplateId === t.id
                        ? "border-primary bg-primary/5"
                        : "border-gray-200 hover:border-gray-300 hover:bg-gray-50",
                    ].join(" ")}
                  >
                    <p className="text-sm font-medium">{t.name}</p>
                    {t.description && (
                      <p className="text-xs text-muted-foreground mt-0.5">{t.description}</p>
                    )}
                  </button>
                ))}
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <Button variant="outline" size="sm" onClick={() => setImportTemplateOpen(false)}>Cancel</Button>
                <Button size="sm" onClick={importTemplate} disabled={!selectedTemplateId || importing}>
                  {importing ? "Importing…" : "Import"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Collapsible service time sections */}
          <CardContent className="p-0">
            {times.map((time) => {
              const isCollapsed = collapsedTimes[time.id] ?? false
              const timeItems = time.items

              return (
                <div key={time.id} className="border-t">
                  {/* Time section header */}
                  <div className="flex items-center gap-1.5 px-4 py-2">
                    <button
                      type="button"
                      onClick={() => toggleCollapsed(time.id)}
                      className="text-muted-foreground hover:text-foreground shrink-0"
                    >
                      {isCollapsed
                        ? <ChevronDown className="h-4 w-4 -rotate-90" />
                        : <ChevronDown className="h-4 w-4" />}
                    </button>

                    {renamingTimeId === time.id ? (
                      <div className="flex items-center gap-1">
                        <input
                          className="text-xs border rounded px-1.5 h-6 w-24 outline-none bg-background"
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") renameTime(time.id, renameValue)
                            if (e.key === "Escape") setRenamingTimeId(null)
                          }}
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => renameTime(time.id, renameValue)}
                          className="hover:text-green-600 text-muted-foreground"
                        >
                          <Check className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setRenamingTimeId(null)}
                          className="hover:text-foreground text-muted-foreground"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <span className="text-sm font-semibold">{time.label}</span>
                        <button
                          type="button"
                          onClick={() => { setRenameValue(time.label); setRenamingTimeId(time.id) }}
                          className="text-muted-foreground hover:text-foreground"
                          title="Rename"
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                      </>
                    )}

                    <span className="text-xs text-muted-foreground">({timeItems.length})</span>

                    {times.length > 1 && (
                      <button
                        type="button"
                        onClick={() => deleteTime(time.id)}
                        className="text-muted-foreground hover:text-destructive"
                        title="Delete this service time"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}

                    <div className="ml-auto flex items-center gap-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs px-2 shrink-0"
                        onClick={() => { resetAddForm(); setAddingItemForTimeId(time.id) }}
                      >
                        <Plus className="h-3 w-3 mr-0.5" /> Add Item
                      </Button>
                    </div>
                  </div>

                  {/* Items (when not collapsed) */}
                  {!isCollapsed && (
                    <div className="px-4 pb-3 space-y-2">
                      {addingItemForTimeId === time.id && (
                        <div className="border rounded p-3 space-y-2 bg-blue-50">
                          {/* Type selector */}
                          <div className="flex gap-2 flex-wrap">
                            {(["SONG", "SERMON", "PRAYER", "ITEM", "HEADER"] as ProgramItemType[]).map((t) => (
                              <button
                                key={t}
                                type="button"
                                onClick={() => { setItemType(t); setSongSearch(""); setSelectedSongId(""); setSelectedArrId("") }}
                                className={`px-3 py-1 rounded text-xs font-medium border transition-colors ${
                                  itemType === t ? TYPE_COLORS[t] + " border-current" : "bg-white text-muted-foreground border-gray-200"
                                }`}
                              >
                                {TYPE_LABELS[t]}
                              </button>
                            ))}
                            <button
                              type="button"
                              onClick={selectSyncedType}
                              className={`px-3 py-1 rounded text-xs font-medium border transition-colors flex items-center gap-1 ${
                                itemType === "SYNCED" ? "bg-green-100 text-green-700 border-current" : "bg-white text-muted-foreground border-gray-200"
                              }`}
                            >
                              <Link2 className="h-3 w-3" /> Synced Item
                            </button>
                          </div>

                          {itemType === "SYNCED" && (
                            <div className="space-y-1.5">
                              {addLinkLoading ? (
                                <p className="text-xs text-muted-foreground italic">Loading items…</p>
                              ) : (
                                <>
                                  <Select value={addLinkServiceId} onValueChange={(v) => { setAddLinkServiceId(v); setAddLinkItemId("") }}>
                                    <SelectTrigger className="h-8 text-sm">
                                      <SelectValue placeholder="Select service…" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {linkServices.map((s) => (
                                        <SelectItem key={s.id} value={s.id}>
                                          {s.id === init.id
                                            ? `This Service — ${new Date(s.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
                                            : `${s.title} — ${new Date(s.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  {addLinkServiceId && (() => {
                                    const svc = linkServices.find((s) => s.id === addLinkServiceId)
                                    const available = svc?.times.flatMap((t) =>
                                      t.items.map((it) => ({ ...it, timeLabel: t.label }))
                                    ) ?? []
                                    return available.length === 0 ? (
                                      <p className="text-xs text-muted-foreground italic">No items in this service.</p>
                                    ) : (
                                      <Select value={addLinkItemId} onValueChange={setAddLinkItemId}>
                                        <SelectTrigger className="h-8 text-sm">
                                          <SelectValue placeholder="Select item to sync with…" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {available.map((it) => (
                                            <SelectItem key={it.id} value={it.id}>
                                              {it.timeLabel} — {it.type === "SONG" ? (it.song?.title ?? "Song") : (it.name ?? it.type)}
                                              {it.syncGroupId ? " 🔗" : ""}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    )
                                  })()}
                                </>
                              )}
                            </div>
                          )}

                          {itemType === "SONG" && (
                            <>
                              <div className="relative">
                                <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-muted-foreground" />
                                <Input
                                  className="pl-7 h-8 text-sm"
                                  placeholder="Search songs…"
                                  value={songSearch}
                                  onChange={(e) => { setSongSearch(e.target.value); setSelectedSongId(""); setSelectedArrId("") }}
                                />
                              </div>
                              {songSearch && (
                                <div className="border rounded bg-white max-h-40 overflow-y-auto divide-y">
                                  {filteredSongs.length === 0 ? (
                                    <p className="text-xs text-muted-foreground p-2">No songs found.</p>
                                  ) : (
                                    filteredSongs.map((s) => (
                                      <button
                                        key={s.id}
                                        onClick={() => { setSelectedSongId(s.id); setSelectedArrId(""); setSongSearch(s.title) }}
                                        className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${selectedSongId === s.id ? "bg-blue-50" : ""}`}
                                      >
                                        <span className="font-medium">{s.title}</span>
                                        {s.author && <span className="text-muted-foreground ml-1">— {s.author}</span>}
                                      </button>
                                    ))
                                  )}
                                </div>
                              )}
                              {!songSearch && !selectedSongId && (
                                <p className="text-xs text-muted-foreground">Type to search songs…</p>
                              )}
                              {selectedSong && (
                                <Select value={selectedArrId} onValueChange={setSelectedArrId}>
                                  <SelectTrigger><SelectValue placeholder="Select arrangement…" /></SelectTrigger>
                                  <SelectContent>
                                    {selectedSong.arrangements.map((a) => (
                                      <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              )}
                            </>
                          )}

                          {itemType === "ITEM" && (
                            <Input
                              placeholder="Item name (e.g. Announcements, Offering…)"
                              value={itemName}
                              onChange={(e) => setItemName(e.target.value)}
                              className="h-8 text-sm"
                            />
                          )}
                          {itemType === "HEADER" && (
                            <Input
                              placeholder="Header label (e.g. Worship, Offering)"
                              value={itemName}
                              onChange={(e) => setItemName(e.target.value)}
                              className="h-8 text-sm"
                            />
                          )}
                          {itemType === "SERMON" && (
                            <>
                              <Input
                                placeholder="Sermon title"
                                value={itemName}
                                onChange={(e) => setItemName(e.target.value)}
                                className="h-8 text-sm"
                              />
                              <Input
                                placeholder="Main passage (e.g. John 3:16–17)"
                                value={itemSermonPassage}
                                onChange={(e) => setItemSermonPassage(e.target.value)}
                                className="h-8 text-sm"
                              />
                            </>
                          )}
                          {itemType !== "SYNCED" && itemType !== "HEADER" && (
                            <NotesEditor
                              value={itemNotes}
                              onChange={setItemNotes}
                              placeholder={
                                itemType === "SERMON" ? "Speaker, theme, additional notes…" :
                                itemType === "PRAYER" ? "Prayer intention, leader…" :
                                "Notes (optional)"
                              }
                              rows={3}
                            />
                          )}
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => addItem(time.id)}>Add</Button>
                            <Button size="sm" variant="outline" onClick={resetAddForm}>Cancel</Button>
                          </div>
                        </div>
                      )}

                      {timeItems.length === 0 && addingItemForTimeId !== time.id && (
                        <p className="text-sm text-muted-foreground text-center py-4">No items yet.</p>
                      )}

                      {timeItems.map((item, i) => (
                        <div
                          key={item.id}
                          draggable={editingId !== item.id}
                          onDragStart={() => editingId !== item.id && handleDragStart(i, time.id)}
                          onDragOver={(e) => editingId !== item.id && handleDragOver(e, i, time.id)}
                          onDragEnd={() => editingId !== item.id && handleDragEnd(time.id)}
                          onClick={() => editingId !== item.id && startEdit(item)}
                          onMouseEnter={() => setHoveredItemId(item.id)}
                          onMouseLeave={() => setHoveredItemId(null)}
                          className={`border rounded bg-white ${editingId === item.id ? "p-3" : item.type === "HEADER" ? "flex items-center gap-2 p-2 hover:bg-gray-50 cursor-pointer" : "flex items-start gap-2 p-2 hover:bg-gray-50 cursor-pointer"}`}
                        >
                          {editingId === item.id ? (
                            <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center gap-1.5">
                                <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${TYPE_COLORS[item.type]}`}>
                                  {TYPE_LABELS[item.type]}
                                </span>
                                {item.type === "SONG" && (
                                  <span className="text-sm font-medium">{item.song?.title}</span>
                                )}
                              </div>
                              {item.type === "SERMON" && !item.name && (
                                <p className="text-xs text-muted-foreground">Fill in the sermon details below</p>
                              )}
                              {item.type === "ITEM" && (
                                <Input
                                  placeholder="Item name (e.g. Announcements, Offering…)"
                                  value={editName}
                                  onChange={(e) => setEditName(e.target.value)}
                                  className="h-8 text-sm"
                                  autoFocus
                                />
                              )}
                              {item.type === "HEADER" && (
                                <Input
                                  placeholder="Header label"
                                  value={editName}
                                  onChange={(e) => setEditName(e.target.value)}
                                  className="h-8 text-sm"
                                  autoFocus
                                />
                              )}
                              {item.type === "SERMON" && (
                                <>
                                  <Input
                                    placeholder="Sermon title"
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    className="h-8 text-sm"
                                    autoFocus
                                  />
                                  <Input
                                    placeholder="Main passage (e.g. John 3:16–17)"
                                    value={editSermonPassage}
                                    onChange={(e) => setEditSermonPassage(e.target.value)}
                                    className="h-8 text-sm"
                                  />
                                </>
                              )}
                              {item.type === "SONG" && (
                                <Select value={editArrId} onValueChange={setEditArrId}>
                                  <SelectTrigger className="h-8 text-sm">
                                    <SelectValue placeholder="Select arrangement…" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {allSongs.find((s) => s.id === item.song?.id)?.arrangements.map((a) => (
                                      <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              )}
                              {item.type !== "HEADER" && (
                                <NotesEditor
                                  value={editNotes}
                                  onChange={setEditNotes}
                                  placeholder={item.type === "SERMON" ? "Speaker, theme, additional notes…" : "Notes (optional)"}
                                  rows={3}
                                />
                              )}
                              <div className="flex gap-2">
                                <Button size="sm" onClick={() => saveEdit(item)} disabled={editSaving}>
                                  <Check className="h-3.5 w-3.5 mr-1" />{editSaving ? "Saving…" : "Save"}
                                </Button>
                                <Button size="sm" variant="outline" onClick={cancelEdit}>
                                  <X className="h-3.5 w-3.5 mr-1" />Cancel
                                </Button>
                              </div>

                              {/* ── Sync section ─────────────────────────────── */}
                              {item.type !== "HEADER" && (<div className="border-t pt-2">
                                {item.syncGroupId ? (
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="flex items-center gap-1 text-green-700 font-medium">
                                      <Link2 className="h-3 w-3" /> Linked item
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => unlinkItem(item)}
                                      className="text-muted-foreground hover:text-destructive"
                                    >
                                      Unlink
                                    </button>
                                  </div>
                                ) : showLinkPanel ? (
                                  <div className="space-y-1.5">
                                    <p className="text-xs font-medium text-muted-foreground">Link with item from any service time</p>
                                    {linkLoading ? (
                                      <p className="text-xs text-muted-foreground italic">Loading services…</p>
                                    ) : (
                                      <>
                                        <Select value={linkServiceId} onValueChange={(v) => { setLinkServiceId(v); setLinkItemId("") }}>
                                          <SelectTrigger className="h-7 text-xs">
                                            <SelectValue placeholder="Select service…" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {linkServices.map((s) => (
                                              <SelectItem key={s.id} value={s.id}>
                                                {s.id === init.id
                                                  ? `This Service — ${new Date(s.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
                                                  : `${s.title} — ${new Date(s.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`}
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                        {linkServiceId && (() => {
                                          const svc = linkServices.find((s) => s.id === linkServiceId)
                                          const allItems = svc?.times.flatMap((t) =>
                                            t.items
                                              .filter((it) => it.id !== item.id)
                                              .map((it) => ({ ...it, timeLabel: t.label }))
                                          ) ?? []
                                          return allItems.length === 0 ? (
                                            <p className="text-xs text-muted-foreground italic">No items available.</p>
                                          ) : (
                                            <Select value={linkItemId} onValueChange={setLinkItemId}>
                                              <SelectTrigger className="h-7 text-xs">
                                                <SelectValue placeholder="Select item…" />
                                              </SelectTrigger>
                                              <SelectContent>
                                                {allItems.map((it) => (
                                                  <SelectItem key={it.id} value={it.id}>
                                                    {it.timeLabel} — {it.type === "SONG" ? (it.song?.title ?? "Song") : (it.name ?? it.type)}
                                                    {it.syncGroupId ? " 🔗" : ""}
                                                  </SelectItem>
                                                ))}
                                              </SelectContent>
                                            </Select>
                                          )
                                        })()}
                                        <div className="flex gap-1.5">
                                          <Button size="sm" className="h-6 text-xs px-2" onClick={() => doLink(item)} disabled={!linkItemId}>
                                            Link
                                          </Button>
                                          <Button size="sm" variant="outline" className="h-6 text-xs px-2" onClick={() => { setShowLinkPanel(false); setLinkServiceId(""); setLinkItemId("") }}>
                                            Cancel
                                          </Button>
                                        </div>
                                      </>
                                    )}
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={openLinkPanel}
                                    className="text-xs flex items-center gap-1 text-muted-foreground hover:text-foreground"
                                  >
                                    <Link2 className="h-3 w-3" /> Link with another item
                                  </button>
                                )}
                              </div>)}
                            </div>
                          ) : (
                            <>
                              <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                              {item.type === "HEADER" ? (
                                <>
                                  <div className="flex-1 flex items-center gap-2 min-w-0">
                                    <div className="flex-1 h-px bg-gray-300" />
                                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap">
                                      {item.name || "Section"}
                                    </span>
                                    <div className="flex-1 h-px bg-gray-300" />
                                  </div>
                                  <button
                                    type="button"
                                    className="h-7 w-7 inline-flex items-center justify-center rounded text-destructive shrink-0 transition-opacity hover:bg-destructive/10"
                                    style={{ opacity: hoveredItemId === item.id ? 1 : 0, pointerEvents: hoveredItemId === item.id ? "auto" : "none" }}
                                    onClick={(e) => { e.stopPropagation(); removeItem(item.id) }}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                </>
                              ) : (
                                <>
                                  <span className="text-sm text-muted-foreground w-5 shrink-0 mt-0.5">{i + 1}.</span>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${TYPE_COLORS[item.type]}`}>
                                        {TYPE_LABELS[item.type]}
                                      </span>
                                      <p className="font-medium text-sm truncate">
                                        {item.type === "SONG"
                                          ? item.song?.title
                                          : item.type === "SERMON"
                                          ? (item.name || "Sermon")
                                          : item.type === "ITEM"
                                          ? (item.name || "Item")
                                          : TYPE_LABELS[item.type]}
                                      </p>
                                    </div>
                                    {item.type === "SONG" && item.arrangement && (
                                      <Badge variant="outline" className="text-xs mt-0.5">{item.arrangement.name}</Badge>
                                    )}
                                    {item.type === "SERMON" && item.sermonPassage && (
                                      <p className="text-xs text-muted-foreground mt-0.5">📖 {item.sermonPassage}</p>
                                    )}
                                    {item.notes && <NotesContent notes={item.notes} />}
                                  </div>
                                  {item.syncGroupId && (
                                    <span title="Synced with other services" className="shrink-0 mt-0.5">
                                      <Link2 className="h-3.5 w-3.5 text-green-600" />
                                    </span>
                                  )}
                                  <button
                                    type="button"
                                    className="h-7 w-7 inline-flex items-center justify-center rounded text-destructive shrink-0 transition-opacity hover:bg-destructive/10"
                                    style={{ opacity: hoveredItemId === item.id ? 1 : 0, pointerEvents: hoveredItemId === item.id ? "auto" : "none" }}
                                    onClick={(e) => { e.stopPropagation(); removeItem(item.id) }}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                </>
                              )}
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </CardContent>
        </Card>
      </div>

      {/* ── Slot detail dialog ─────────────────────────────────────────────── */}
      <Dialog open={!!slotDialog} onOpenChange={(open) => { if (!open) setSlotDialog(null) }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">{slotDialog?.slot.user?.name}</DialogTitle>
            <p className="text-xs text-muted-foreground">{slotDialog?.roleName} · {slotDialog?.teamName}</p>
          </DialogHeader>

          <div className="space-y-4">
            {/* Status */}
            <div>
              <p className="text-xs font-medium mb-2">Status</p>
              <div className="flex gap-2">
                {(["PENDING", "CONFIRMED", "DECLINED"] as const).map((s) => {
                  const styles = {
                    PENDING:   { active: "bg-yellow-100 text-yellow-800 border-yellow-300", icon: "?" },
                    CONFIRMED: { active: "bg-green-100 text-green-800 border-green-300", icon: "✓" },
                    DECLINED:  { active: "bg-red-100 text-red-800 border-red-300", icon: "✗" },
                  }
                  const { active, icon } = styles[s]
                  const isActive = dialogStatus === s
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setDialogStatus(s)}
                      className={`flex-1 text-xs py-1.5 rounded border font-medium transition-colors ${isActive ? active : "border-gray-200 text-muted-foreground hover:bg-gray-50"}`}
                    >
                      {icon} {s.charAt(0) + s.slice(1).toLowerCase()}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Rehearsal */}
            <div className="flex items-center gap-2">
              <input
                id="slot-rehearsal"
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300"
                checked={dialogRehearsal}
                onChange={(e) => setDialogRehearsal(e.target.checked)}
              />
              <label htmlFor="slot-rehearsal" className="text-sm cursor-pointer">Attending rehearsal</label>
            </div>

            {/* Notes */}
            <div>
              <p className="text-xs font-medium mb-1.5">Notes</p>
              <Textarea
                className="text-sm resize-none"
                rows={3}
                placeholder="e.g. Needs to leave early, bringing acoustic…"
                value={dialogNotes}
                onChange={(e) => setDialogNotes(e.target.value)}
              />
            </div>

            {/* Service time assignments */}
            {(() => {
              if (!slotDialog) return null
              const userId = slotDialog.slot.user!.id
              const roleId = slotDialog.slot.role.id
              // All service teams for the same team (across service times)
              const teamInstances = teams.filter((t) => t.team.id === slotDialog.teamId)
              if (teamInstances.length <= 1) return null
              return (
                <div>
                  <p className="text-xs font-medium mb-2">Serving for</p>
                  <div className="space-y-1.5">
                    {teamInstances.map((st) => {
                      const timeLabel = st.serviceTimeId
                        ? (times.find((ti) => ti.id === st.serviceTimeId)?.label ?? "Unknown")
                        : "General"
                      const assignedSlot = st.slots.find((s) => s.role.id === roleId && s.user?.id === userId)
                      const isChecked = !!assignedSlot
                      return (
                        <div key={st.id} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id={`serving-${st.id}`}
                            className="h-4 w-4 rounded border-gray-300 cursor-pointer"
                            checked={isChecked}
                            onChange={async (e) => {
                              if (e.target.checked) {
                                await addSlot(st.id, roleId, userId)
                              } else if (assignedSlot) {
                                await removeSlot(assignedSlot.id)
                              }
                            }}
                          />
                          <label htmlFor={`serving-${st.id}`} className="text-sm cursor-pointer">{timeLabel}</label>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })()}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setSlotDialog(null)}>Cancel</Button>
            <Button size="sm" onClick={saveSlotDialog} disabled={dialogSaving}>
              {dialogSaving ? "Saving…" : "Save"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ── Rich-text notes editor with formatting toolbar ────────────────────────────
function NotesEditor({
  value,
  onChange,
  placeholder,
  rows = 3,
}: {
  value: string
  onChange: (val: string) => void
  placeholder?: string
  rows?: number
}) {
  const ref = useRef<HTMLTextAreaElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  function toggleBullet() {
    const ta = ref.current
    if (!ta) return
    const { selectionStart, selectionEnd } = ta
    const text = ta.value
    const lineStart = text.lastIndexOf("\n", selectionStart - 1) + 1
    const before = text.slice(0, lineStart)
    const selected = text.slice(lineStart, selectionEnd)
    const after = text.slice(selectionEnd)
    const isBulleted = selected.startsWith("- ")
    const newSelected = selected
      .split("\n")
      .map((l) => (isBulleted ? (l.startsWith("- ") ? l.slice(2) : l) : l.trim() ? "- " + l : l))
      .join("\n")
    onChange(before + newSelected + after)
    setTimeout(() => {
      ta.focus()
      ta.setSelectionRange(lineStart, lineStart + newSelected.length)
    }, 0)
  }

  function insertLine() {
    const ta = ref.current
    if (!ta) return
    const { selectionStart } = ta
    const newText = ta.value.slice(0, selectionStart) + "\n──────────\n" + ta.value.slice(selectionStart)
    onChange(newText)
    setTimeout(() => { ta.focus(); ta.setSelectionRange(selectionStart + 12, selectionStart + 12) }, 0)
  }

  function wrapInline(marker: string) {
    const ta = ref.current
    if (!ta) return
    const { selectionStart, selectionEnd } = ta
    const selected = ta.value.slice(selectionStart, selectionEnd) || "text"
    const wrapped = marker + selected + marker
    const newText = ta.value.slice(0, selectionStart) + wrapped + ta.value.slice(selectionEnd)
    onChange(newText)
    setTimeout(() => {
      ta.focus()
      ta.setSelectionRange(selectionStart + marker.length, selectionStart + marker.length + selected.length)
    }, 0)
  }

  function insertLink() {
    const ta = ref.current
    if (!ta) return
    const { selectionStart, selectionEnd } = ta
    const selectedText = ta.value.slice(selectionStart, selectionEnd) || "link text"
    const url = window.prompt("Enter URL:", "https://")
    if (!url) return
    const linked = `[${selectedText}](${url})`
    const newText = ta.value.slice(0, selectionStart) + linked + ta.value.slice(selectionEnd)
    onChange(newText)
    setTimeout(() => { ta.focus(); ta.setSelectionRange(selectionStart + 1, selectionStart + 1 + selectedText.length) }, 0)
  }

  async function handleAttach(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const formData = new FormData()
    formData.append("file", file)
    const res = await fetch("/api/uploads", { method: "POST", body: formData })
    if (res.ok) {
      const { url } = await res.json()
      const insert = `[📎 ${file.name}](${url})`
      const ta = ref.current
      if (!ta) return
      const pos = ta.selectionStart
      onChange(ta.value.slice(0, pos) + insert + ta.value.slice(pos))
    }
    e.target.value = ""
  }

  const btn = "inline-flex items-center text-xs px-2 py-0.5 rounded border bg-white hover:bg-gray-50 text-muted-foreground"

  return (
    <div className="space-y-1">
      <div className="flex gap-1 flex-wrap">
        <button type="button" onClick={() => wrapInline("**")}   title="Bold"          className={`${btn} font-bold`}>B</button>
        <button type="button" onClick={() => wrapInline("_")}    title="Italic"        className={`${btn} italic`}>I</button>
        <button type="button" onClick={() => wrapInline("__")}   title="Underline"     className={`${btn} underline`}>U</button>
        <button type="button" onClick={() => wrapInline("~~")}   title="Strikethrough" className={`${btn} line-through`}>S</button>
        <button type="button" onClick={toggleBullet}             title="Bullet list"   className={`${btn} gap-1`}><span className="text-sm leading-none">•</span> List</button>
        <button type="button" onClick={insertLink}               title="Hyperlink"     className={btn}>Link</button>
        <button type="button" onClick={() => fileRef.current?.click()} title="Attach file" className={btn}>Attach</button>
        <button type="button" onClick={insertLine}               title="Divider line"  className={btn}>— Line</button>
      </div>
      <input ref={fileRef} type="file" className="hidden" onChange={handleAttach} />
      <Textarea
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="text-sm"
      />
    </div>
  )
}

// ── Inline formatter parser ────────────────────────────────────────────────────
function parseInline(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = []
  const re = /(\*\*[^*]+\*\*|__[^_]+__|~~[^~]+~~|_[^_]+_|\[[^\]]+\]\([^)]+\))/g
  let last = 0, m: RegExpExecArray | null, k = 0
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index))
    const raw = m[0]
    if (raw.startsWith("**"))
      parts.push(<strong key={k++} className="font-semibold">{raw.slice(2, -2)}</strong>)
    else if (raw.startsWith("__"))
      parts.push(<u key={k++}>{raw.slice(2, -2)}</u>)
    else if (raw.startsWith("~~"))
      parts.push(<del key={k++}>{raw.slice(2, -2)}</del>)
    else if (raw.startsWith("[")) {
      const lm = raw.match(/^\[([^\]]+)\]\(([^)]+)\)$/)
      if (lm) parts.push(<a key={k++} href={lm[2]} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline hover:text-blue-800">{lm[1]}</a>)
    } else
      parts.push(<em key={k++}>{raw.slice(1, -1)}</em>)
    last = m.index + raw.length
  }
  if (last < text.length) parts.push(text.slice(last))
  return parts
}

// ── Formatted notes display ────────────────────────────────────────────────────
function NotesContent({ notes }: { notes: string }) {
  const elements: React.ReactNode[] = []
  let bullets: string[] = []
  let key = 0

  function flush() {
    if (bullets.length === 0) return
    elements.push(
      <ul key={key++} className="list-disc list-inside text-xs text-muted-foreground leading-relaxed">
        {bullets.map((b, i) => <li key={i}>{parseInline(b)}</li>)}
      </ul>
    )
    bullets = []
  }

  for (const line of notes.split("\n")) {
    if (line.startsWith("- ")) {
      bullets.push(line.slice(2))
    } else if (/^─+$/.test(line)) {
      flush()
      elements.push(<hr key={key++} className="border-gray-200 my-0.5" />)
    } else {
      flush()
      if (line.trim()) elements.push(<p key={key++} className="text-xs text-muted-foreground leading-snug">{parseInline(line)}</p>)
    }
  }
  flush()

  return <div className="mt-1 space-y-0.5">{elements}</div>
}
