"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import {
  Plus, Trash2, ChevronLeft, X, ChevronDown, Pencil, Check,
  GripVertical, Clock, Users, UserPlus,
} from "lucide-react"

type ItemType = "SONG" | "SERMON" | "PRAYER" | "ITEM" | "HEADER"

interface TemplateItem { id: string; type: ItemType; name: string | null; order: number; neededRoles: string[] }

interface TemplateTeamEntry { id: string; team: { id: string; name: string; roles: { id: string; name: string }[] }; templateTimeId: string | null }
interface TemplateTime {
  id: string
  label: string
  startTime: string | null
  order: number
  items: TemplateItem[]
}
interface Template {
  id: string
  name: string
  description: string | null
  times: TemplateTime[]
  templateTeams: TemplateTeamEntry[]
}
interface Team { id: string; name: string; roles: { id: string; name: string }[] }

interface Props {
  template: Template
  allTeams: Team[]
}

const TYPE_LABELS: Record<ItemType, string> = { SONG: "Song", SERMON: "Sermon", PRAYER: "Prayer", ITEM: "Item", HEADER: "Header" }
const TYPE_COLORS: Record<ItemType, string> = {
  SONG: "bg-blue-100 text-blue-700",
  SERMON: "bg-purple-100 text-purple-700",
  PRAYER: "bg-green-100 text-green-700",
  ITEM: "bg-muted text-gray-700",
  HEADER: "bg-border text-gray-600",
}

function normalizeItem(item: TemplateItem): TemplateItem {
  return { ...item, neededRoles: Array.isArray(item.neededRoles) ? item.neededRoles : [] }
}

function normalizeTemplate(t: Template): Template {
  return { ...t, times: t.times.map(time => ({ ...time, items: time.items.map(normalizeItem) })) }
}

export default function TemplateEditor({ template: init, allTeams }: Props) {
  const [template, setTemplate] = useState(() => normalizeTemplate(init as unknown as Template))
  const [name, setName] = useState(init.name)
  const [description, setDescription] = useState(init.description ?? "")
  const [editingName, setEditingName] = useState(false)

  // ── Schedule state ──────────────────────────────────────────────────────────
  const [scheduleOpen, setScheduleOpen] = useState(true)
  const [editingTimeStartId, setEditingTimeStartId] = useState<string | null>(null)
  const [editTimeStartValue, setEditTimeStartValue] = useState("")

  // ── Teams panel state ───────────────────────────────────────────────────────
  const [teamsOpenByKey, setTeamsOpenByKey] = useState<Record<string, boolean>>({})

  // ── Program Order state ─────────────────────────────────────────────────────
  const [collapsedTimes, setCollapsedTimes] = useState<Record<string, boolean>>({})
  const [renamingTimeId, setRenamingTimeId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState("")
  const [newTimeLabel, setNewTimeLabel] = useState("")

  // ── Add item state ──────────────────────────────────────────────────────────
  const [addingItemForTimeId, setAddingItemForTimeId] = useState<string | null>(null)
  const [itemType, setItemType] = useState<ItemType>("ITEM")
  const [itemName, setItemName] = useState("")
  const [hoveredItemId, setHoveredItemId] = useState<string | null>(null)
  const [rolesOpenForItemId, setRolesOpenForItemId] = useState<string | null>(null)
  const [roleInput, setRoleInput] = useState("")

  // ── Name/description ────────────────────────────────────────────────────────
  async function saveName() {
    if (!name.trim()) return
    const res = await fetch(`/api/templates/${template.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), description: description || null }),
    })
    if (res.ok) { setEditingName(false); toast.success("Saved") }
    else toast.error("Failed to save")
  }

  async function saveDescription() {
    await fetch(`/api/templates/${template.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description: description || null }),
    })
  }

  // ── Service times ───────────────────────────────────────────────────────────
  async function addTime() {
    if (!newTimeLabel.trim()) return
    const res = await fetch(`/api/templates/${template.id}/times`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: newTimeLabel.trim(), order: template.times.length }),
    })
    if (res.ok) {
      const time = await res.json()
      setTemplate({ ...template, times: [...template.times, { ...time, items: [] }] })
      setNewTimeLabel("")
      toast.success("Time added")
    }
  }

  async function renameTime(timeId: string, label: string) {
    if (!label.trim()) return
    const res = await fetch(`/api/templates/${template.id}/times/${timeId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: label.trim() }),
    })
    if (res.ok) {
      setTemplate({ ...template, times: template.times.map((t) => t.id === timeId ? { ...t, label: label.trim() } : t) })
      setRenamingTimeId(null)
    }
  }

  async function saveTimeStart(timeId: string) {
    await fetch(`/api/templates/${template.id}/times/${timeId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ startTime: editTimeStartValue || null }),
    })
    setTemplate({ ...template, times: template.times.map((t) => t.id === timeId ? { ...t, startTime: editTimeStartValue || null } : t) })
    setEditingTimeStartId(null)
  }

  async function deleteTime(timeId: string) {
    if (!confirm("Delete this service time and all its items?")) return
    const res = await fetch(`/api/templates/${template.id}/times/${timeId}`, { method: "DELETE" })
    if (res.ok) {
      setTemplate({
        ...template,
        times: template.times.filter((t) => t.id !== timeId),
        templateTeams: template.templateTeams.map((tt) =>
          tt.templateTimeId === timeId ? { ...tt, templateTimeId: null } : tt
        ),
      })
    }
  }

  // ── Items ───────────────────────────────────────────────────────────────────
  async function addItem(timeId: string) {
    const time = template.times.find((t) => t.id === timeId)!
    const res = await fetch(`/api/templates/${template.id}/times/${timeId}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: itemType, name: itemName.trim() || null, order: time.items.length }),
    })
    if (res.ok) {
      const item = await res.json()
      setTemplate({
        ...template,
        times: template.times.map((t) => t.id === timeId ? { ...t, items: [...t.items, item] } : t),
      })
      setItemName("")
      setItemType("ITEM")
      setAddingItemForTimeId(null)
    }
  }

  async function deleteItem(timeId: string, itemId: string) {
    const res = await fetch(`/api/templates/${template.id}/times/${timeId}/items/${itemId}`, { method: "DELETE" })
    if (res.ok) {
      setTemplate({
        ...template,
        times: template.times.map((t) =>
          t.id === timeId ? { ...t, items: t.items.filter((i) => i.id !== itemId) } : t
        ),
      })
    }
  }

  async function patchItemRoles(timeId: string, itemId: string, neededRoles: string[]) {
    setTemplate(prev => ({
      ...prev,
      times: prev.times.map(t => t.id === timeId
        ? { ...t, items: t.items.map(i => i.id === itemId ? { ...i, neededRoles } : i) }
        : t
      ),
    }))
    await fetch(`/api/templates/${template.id}/times/${timeId}/items/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ neededRoles }),
    })
  }

  // ── Teams ───────────────────────────────────────────────────────────────────
  async function addTeam(teamId: string, templateTimeId: string | null) {
    if (template.templateTeams.some((tt) => tt.team.id === teamId && tt.templateTimeId === templateTimeId)) {
      toast.error("Team already added to this section"); return
    }
    const res = await fetch(`/api/templates/${template.id}/teams`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teamId, templateTimeId }),
    })
    if (res.ok) {
      const templateTeam = await res.json()
      const team = allTeams.find((t) => t.id === teamId)!
      setTemplate({ ...template, templateTeams: [...template.templateTeams, { ...templateTeam, team }] })
      toast.success("Team added")
    } else {
      toast.error("Failed to add team")
    }
  }

  async function removeTeam(templateTeamId: string) {
    const res = await fetch(`/api/templates/${template.id}/teams/${templateTeamId}`, { method: "DELETE" })
    if (res.ok) {
      setTemplate({ ...template, templateTeams: template.templateTeams.filter((tt) => tt.id !== templateTeamId) })
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2 min-w-0">
          <Link href="/mychurch/services/templates">
            <Button variant="ghost" size="icon" className="mt-0.5 shrink-0"><ChevronLeft className="h-4 w-4" /></Button>
          </Link>
          <div className="min-w-0">
            {editingName ? (
              <div className="flex items-center gap-2 mb-0.5">
                <Input
                  className="h-8 text-lg font-bold w-72"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") saveName(); if (e.key === "Escape") setEditingName(false) }}
                  autoFocus
                />
                <button type="button" onClick={saveName} className="text-green-600 hover:text-green-700">
                  <Check className="h-4 w-4" />
                </button>
                <button type="button" onClick={() => setEditingName(false)} className="text-muted-foreground hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="flex items-center gap-1.5 text-left group"
                onClick={() => setEditingName(true)}
              >
                <h1 className="text-2xl font-bold leading-tight">{name}</h1>
                <Pencil className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity mt-1" />
              </button>
            )}
            <input
              className="text-sm text-muted-foreground bg-transparent border-none outline-none w-full mt-0.5"
              placeholder="Add a description…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={saveDescription}
            />
          </div>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-[260px_1fr]">
        {/* ── Left column ──────────────────────────────────────────────────── */}
        <div className="space-y-2">

          {/* Schedule panel */}
          <div className="border rounded-lg overflow-hidden bg-card">
            <button
              type="button"
              className="w-full flex items-center justify-between px-3.5 py-2 hover:bg-accent/50 text-left"
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
                {template.times.map((time) => (
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
                        className="w-full flex items-center gap-1 text-left hover:bg-accent/50 rounded px-1 py-0.5"
                        onClick={() => { setEditTimeStartValue(time.startTime || ""); setEditingTimeStartId(time.id) }}
                      >
                        <span className="text-xs font-medium flex-1 truncate">{time.label}</span>
                        <span className="text-xs text-muted-foreground">{time.startTime || "—"}</span>
                      </button>
                    )}
                  </div>
                ))}
                {template.times.length === 0 && (
                  <p className="text-xs text-muted-foreground">Add a service time to get started.</p>
                )}
              </div>
            )}
          </div>

          {/* Teams grouped by service time */}
          {[...template.times.map((t) => ({ key: t.id, label: t.label })), { key: "general", label: "General" }].map(({ key, label }) => {
            const timeTeams = key === "general"
              ? template.templateTeams.filter((tt) => tt.templateTimeId === null)
              : template.templateTeams.filter((tt) => tt.templateTimeId === key)
            const isOpen = teamsOpenByKey[key] !== false
            const availableTeams = allTeams.filter((t) =>
              !template.templateTeams.some((tt) =>
                tt.team.id === t.id &&
                (key === "general" ? tt.templateTimeId === null : tt.templateTimeId === key)
              )
            )
            return (
              <div key={key} className="border rounded-lg overflow-hidden bg-card">
                <button
                  type="button"
                  className="w-full flex items-center justify-between px-3.5 py-2 hover:bg-accent/50 text-left"
                  onClick={() => setTeamsOpenByKey((prev) => ({ ...prev, [key]: !isOpen }))}
                >
                  <span className="text-sm font-semibold">
                    {label} <span className="font-normal text-muted-foreground text-xs">teams</span>
                  </span>
                  <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-150 ${isOpen ? "" : "-rotate-90"}`} />
                </button>
                {isOpen && (
                  <div className="border-t px-3.5 py-2.5 space-y-1.5">
                    {timeTeams.length === 0 && (
                      <p className="text-xs text-muted-foreground">No teams assigned.</p>
                    )}
                    {timeTeams.map((tt) => (
                      <div key={tt.id} className="flex items-center justify-between rounded border px-2 py-1.5">
                        <span className="text-xs font-semibold flex items-center gap-1.5">
                          <Users className="h-3 w-3 text-muted-foreground" />
                          {tt.team.name}
                        </span>
                        <button
                          type="button"
                          className="text-muted-foreground hover:text-destructive"
                          onClick={() => removeTeam(tt.id)}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                    {availableTeams.length > 0 && (
                      <Select
                        key={`add-${key}-${template.templateTeams.length}`}
                        onValueChange={(teamId) => addTeam(teamId, key === "general" ? null : key)}
                      >
                        <SelectTrigger className="h-7 w-full text-xs border-dashed">
                          <SelectValue placeholder="+ Add team…" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableTeams.map((t) => (
                            <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* ── Program Order ─────────────────────────────────────────────────── */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between py-3 gap-2">
            <CardTitle className="text-base">Program Order</CardTitle>
            <div className="flex items-center gap-2">
              <Input
                className="h-7 text-sm w-44"
                placeholder="Time label (e.g. 9AM)…"
                value={newTimeLabel}
                onChange={(e) => setNewTimeLabel(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addTime()}
              />
              <Button size="sm" variant="outline" onClick={addTime} className="shrink-0">
                <Plus className="h-4 w-4 mr-1" /> Add Time
              </Button>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {template.times.map((time) => {
              const isCollapsed = collapsedTimes[time.id] ?? false
              return (
                <div key={time.id} className="border-t">
                  {/* Time section header */}
                  <div className="flex items-center gap-1.5 px-4 py-2">
                    <button
                      type="button"
                      onClick={() => setCollapsedTimes((prev) => ({ ...prev, [time.id]: !prev[time.id] }))}
                      className="text-muted-foreground hover:text-foreground shrink-0"
                    >
                      <ChevronDown className={`h-4 w-4 transition-transform ${isCollapsed ? "-rotate-90" : ""}`} />
                    </button>

                    {renamingTimeId === time.id ? (
                      <div className="flex items-center gap-1">
                        <input
                          className="text-xs border rounded px-1.5 h-6 w-28 outline-none bg-background"
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") renameTime(time.id, renameValue)
                            if (e.key === "Escape") setRenamingTimeId(null)
                          }}
                          autoFocus
                        />
                        <button type="button" onClick={() => renameTime(time.id, renameValue)} className="hover:text-green-600 text-muted-foreground">
                          <Check className="h-3 w-3" />
                        </button>
                        <button type="button" onClick={() => setRenamingTimeId(null)} className="hover:text-foreground text-muted-foreground">
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

                    <span className="text-xs text-muted-foreground">({time.items.length})</span>
                    <button
                      type="button"
                      onClick={() => deleteTime(time.id)}
                      className="text-muted-foreground hover:text-destructive"
                      title="Delete time"
                    >
                      <X className="h-3 w-3" />
                    </button>

                    <div className="ml-auto">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs px-2 shrink-0"
                        onClick={() => { setItemType("ITEM"); setItemName(""); setAddingItemForTimeId(time.id) }}
                      >
                        <Plus className="h-3 w-3 mr-0.5" /> Add Item
                      </Button>
                    </div>
                  </div>

                  {/* Items */}
                  {!isCollapsed && (
                    <div className="px-4 pb-3 space-y-2">
                      {/* Add item form */}
                      {addingItemForTimeId === time.id && (
                        <div className="border rounded p-3 space-y-2 bg-muted/50">
                          <div className="flex gap-2 flex-wrap">
                            {(["SONG", "SERMON", "PRAYER", "ITEM", "HEADER"] as ItemType[]).map((t) => (
                              <button
                                key={t}
                                type="button"
                                onClick={() => setItemType(t)}
                                className={`px-3 py-1 rounded text-xs font-medium border transition-colors ${
                                  itemType === t
                                    ? TYPE_COLORS[t] + " border-current"
                                    : "bg-card text-muted-foreground border-border"
                                }`}
                              >
                                {TYPE_LABELS[t]}
                              </button>
                            ))}
                          </div>
                          <Input
                            className="h-8 text-sm"
                            placeholder={itemType === "SONG" ? "Song slot label (optional)…" : itemType === "HEADER" ? "Header label…" : "Name (optional)…"}
                            value={itemName}
                            onChange={(e) => setItemName(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && addItem(time.id)}
                          />
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => addItem(time.id)}>Add</Button>
                            <Button size="sm" variant="outline" onClick={() => setAddingItemForTimeId(null)}>Cancel</Button>
                          </div>
                        </div>
                      )}

                      {/* Item list */}
                      {time.items.map((item) => (
                        <div
                          key={item.id}
                          onMouseEnter={() => setHoveredItemId(item.id)}
                          onMouseLeave={() => setHoveredItemId(null)}
                          className={`border rounded bg-card ${item.type === "HEADER" ? "flex items-center gap-2 p-2" : "flex items-start gap-2 p-2"}`}
                        >
                          <GripVertical className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                          {item.type === "HEADER" ? (
                            <>
                              <div className="flex-1 flex items-center gap-2 min-w-0">
                                <div className="flex-1 h-px bg-border" />
                                <span className="text-xs font-bold text-gray-600 uppercase tracking-wide whitespace-nowrap">
                                  {item.name || "Section"}
                                </span>
                                <div className="flex-1 h-px bg-border" />
                              </div>
                              <button
                                type="button"
                                className="h-7 w-7 inline-flex items-center justify-center rounded text-destructive shrink-0 transition-opacity hover:bg-destructive/10"
                                style={{ opacity: hoveredItemId === item.id ? 1 : 0, pointerEvents: hoveredItemId === item.id ? "auto" : "none" }}
                                onClick={() => deleteItem(time.id, item.id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </>
                          ) : (
                            <>
                              <div className="flex-1 min-w-0 space-y-1.5">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${TYPE_COLORS[item.type]}`}>
                                    {TYPE_LABELS[item.type]}
                                  </span>
                                  <p className="font-medium text-sm truncate">
                                    {item.name || <span className="text-muted-foreground font-normal">{TYPE_LABELS[item.type]} slot</span>}
                                  </p>
                                </div>

                                {/* Needed roles */}
                                <div className="flex flex-wrap items-center gap-1">
                                  {item.neededRoles.map((role) => (
                                    <span key={role} className="flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full bg-secondary text-secondary-foreground">
                                      {role}
                                      <button
                                        type="button"
                                        onClick={() => patchItemRoles(time.id, item.id, item.neededRoles.filter(r => r !== role))}
                                        className="hover:text-destructive ml-0.5"
                                      >
                                        <X className="h-2.5 w-2.5" />
                                      </button>
                                    </span>
                                  ))}

                                  {rolesOpenForItemId === item.id ? (
                                    <div className="flex items-start gap-1 mt-0.5 w-full">
                                      <div className="flex-1 space-y-1">
                                        <Input
                                          autoFocus
                                          placeholder="Role name…"
                                          value={roleInput}
                                          onChange={(e) => setRoleInput(e.target.value)}
                                          onKeyDown={(e) => {
                                            if (e.key === "Enter" && roleInput.trim()) {
                                              const role = roleInput.trim()
                                              if (!item.neededRoles.includes(role)) {
                                                patchItemRoles(time.id, item.id, [...item.neededRoles, role])
                                              }
                                              setRoleInput("")
                                            }
                                            if (e.key === "Escape") { setRolesOpenForItemId(null); setRoleInput("") }
                                          }}
                                          className="h-6 text-xs"
                                        />
                                        {(() => {
                                          // Build suggestions from teams assigned to this template
                                          const teamRoles = template.templateTeams.flatMap(tt => tt.team.roles.map(r => r.name))
                                          const fallbackRoles = allTeams.flatMap(t => t.roles.map(r => r.name))
                                          const rolePool = [...new Set(teamRoles.length > 0 ? teamRoles : fallbackRoles)]
                                          const suggestions = rolePool.filter(r => !item.neededRoles.includes(r) && (!roleInput || r.toLowerCase().includes(roleInput.toLowerCase()))).slice(0, 12)
                                          return suggestions.length > 0 ? (
                                            <div className="flex flex-wrap gap-1">
                                              {suggestions.map(r => (
                                                <button
                                                  key={r}
                                                  type="button"
                                                  onClick={() => {
                                                    patchItemRoles(time.id, item.id, [...item.neededRoles, r])
                                                    setRoleInput("")
                                                  }}
                                                  className="text-[10px] px-1.5 py-0.5 rounded-full border hover:bg-accent transition-colors"
                                                >
                                                  {r}
                                                </button>
                                              ))}
                                            </div>
                                          ) : null
                                        })()}
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => { setRolesOpenForItemId(null); setRoleInput("") }}
                                        className="text-muted-foreground hover:text-foreground mt-1"
                                      >
                                        <X className="h-3 w-3" />
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => { setRolesOpenForItemId(item.id); setRoleInput("") }}
                                      className="text-[10px] flex items-center gap-0.5 text-muted-foreground hover:text-foreground transition-colors"
                                    >
                                      <UserPlus className="h-2.5 w-2.5" />
                                      {item.neededRoles.length === 0 ? "Add positions" : ""}
                                    </button>
                                  )}
                                </div>
                              </div>
                              <button
                                type="button"
                                className="h-7 w-7 inline-flex items-center justify-center rounded text-destructive shrink-0 transition-opacity hover:bg-destructive/10"
                                style={{ opacity: hoveredItemId === item.id ? 1 : 0, pointerEvents: hoveredItemId === item.id ? "auto" : "none" }}
                                onClick={() => deleteItem(time.id, item.id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </>
                          )}
                        </div>
                      ))}

                      {time.items.length === 0 && addingItemForTimeId !== time.id && (
                        <p className="text-sm text-muted-foreground text-center py-4">No items yet.</p>
                      )}
                    </div>
                  )}
                </div>
              )
            })}

            {template.times.length === 0 && (
              <div className="px-4 py-10 text-center text-muted-foreground text-sm">
                No service times yet. Add one above.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
