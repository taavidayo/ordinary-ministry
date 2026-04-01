"use client"

import { useState, useRef, useEffect, useCallback, useMemo } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ChevronLeft, Pencil, X, Trash2, Plus, CalendarDays, Users, Camera,
  Home, Briefcase, MapPin, UserPlus, Music2, CalendarCheck, Check, FileText, Heart,
} from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import LocationSearch from "@/components/admin/LocationSearch"
import { ROLE_BADGE, CATEGORY_COLORS } from "@/lib/category-colors"

// ── Types ──────────────────────────────────────────────────────────────────

interface Team { id: string; name: string }
interface ServiceSlot {
  role: { name: string }
  serviceTeam: { team: { name: string }; service: { id: string; title: string; date: string | Date } }
}
interface ProfileNote { id: string; content: string; createdAt: string | Date; author: { id: string; name: string } }
interface MemberCategory { id: string; name: string; color: string }
interface Ministry { id: string; name: string; color: string; description?: string | null }
interface GroupMembership {
  group: { id: string; name: string }
  role: string
  joinedAt: string | Date
}
interface EventRsvp {
  event: { id: string; title: string; startDate: string | Date }
  createdAt: string | Date
}

interface FamilyMemberUser { id: string; name: string; avatar: string | null }
interface FamilyMembership {
  id: string
  familyId: string
  relationship: string
  family: {
    id: string
    name: string
    members: { id: string; userId: string; relationship: string; user: FamilyMemberUser }[]
  }
}

interface GivingRecord {
  id: string; amount: number; currency: string; donorName: string | null
  type: string | null; category: { name: string; color: string } | null
  stripePaymentId: string | null; recurring: boolean; createdAt: string | Date
}

interface User {
  id: string; name: string; email: string; role: string; phone: string | null
  avatar: string | null; birthday: string | Date | null; address: string | null
  gender: string | null; socialProfiles: Record<string, string> | null; createdAt: string | Date
  canViewGiving: boolean
  memberCategory: MemberCategory | null
  ministry: Ministry | null
  teamMemberships: { team: { id: string; name: string }; isLeader: boolean; joinedAt?: string | Date }[]
  groupMemberships: GroupMembership[]
  familyMemberships: FamilyMembership[]
  serviceSlots: ServiceSlot[]
  eventRsvps: EventRsvp[]
  profileNotes?: ProfileNote[] | null
}

interface Props {
  user: User
  allTeams: Team[]
  allMemberCategories: MemberCategory[]
  allMinistries: Ministry[]
  sessionRole: string
  sessionId: string
  timezone: string
  givingHistory: GivingRecord[]
}

// ── Timeline ───────────────────────────────────────────────────────────────

type TimelineFilter = "all" | "joined" | "service" | "events"

type TimelineEvent =
  | { kind: "joined_app"; date: Date }
  | { kind: "joined_team"; date: Date; teamName: string }
  | { kind: "joined_group"; date: Date; groupName: string; isLeader: boolean }
  | { kind: "service"; date: Date; serviceTitle: string; teamName: string; roleName: string }
  | { kind: "event_rsvp"; date: Date; eventTitle: string }

function buildTimeline(user: User): TimelineEvent[] {
  const events: TimelineEvent[] = []
  events.push({ kind: "joined_app", date: new Date(user.createdAt) })
  for (const m of user.teamMemberships) {
    if (m.joinedAt) events.push({ kind: "joined_team", date: new Date(m.joinedAt), teamName: m.team.name })
  }
  for (const m of user.groupMemberships) {
    events.push({ kind: "joined_group", date: new Date(m.joinedAt), groupName: m.group.name, isLeader: m.role === "LEADER" })
  }
  for (const s of user.serviceSlots) {
    events.push({
      kind: "service",
      date: new Date(s.serviceTeam.service.date),
      serviceTitle: s.serviceTeam.service.title,
      teamName: s.serviceTeam.team.name,
      roleName: s.role.name,
    })
  }
  for (const r of user.eventRsvps) {
    events.push({ kind: "event_rsvp", date: new Date(r.createdAt), eventTitle: r.event.title })
  }
  return events.sort((a, b) => b.date.getTime() - a.date.getTime())
}

function matchesFilter(item: TimelineEvent, filter: TimelineFilter): boolean {
  if (filter === "all") return true
  if (filter === "joined") return item.kind === "joined_app" || item.kind === "joined_team" || item.kind === "joined_group"
  if (filter === "service") return item.kind === "service"
  if (filter === "events") return item.kind === "event_rsvp"
  return true
}

function TimelineItem({ item, timezone }: { item: TimelineEvent; timezone: string }) {
  const dateStr = item.date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: timezone })

  let icon: React.ReactNode
  let primary: string
  let secondary: string

  switch (item.kind) {
    case "joined_app":
      icon = <UserPlus className="h-3.5 w-3.5" />
      primary = "Joined the church"
      secondary = dateStr
      break
    case "joined_team":
      icon = <UserPlus className="h-3.5 w-3.5" />
      primary = `Joined team: ${item.teamName}`
      secondary = dateStr
      break
    case "joined_group":
      icon = <UserPlus className="h-3.5 w-3.5" />
      primary = `Joined group: ${item.groupName}${item.isLeader ? " (Leader)" : ""}`
      secondary = dateStr
      break
    case "service":
      icon = <Music2 className="h-3.5 w-3.5" />
      primary = item.serviceTitle
      secondary = `${dateStr} · ${item.teamName} · ${item.roleName}`
      break
    case "event_rsvp":
      icon = <CalendarCheck className="h-3.5 w-3.5" />
      primary = `RSVP'd: ${item.eventTitle}`
      secondary = dateStr
      break
  }

  return (
    <div className="relative pb-5 last:pb-0">
      {/* vertical line continues through the dot */}
      <span className="absolute left-[-1.5rem] top-0 flex flex-col items-center h-full">
        <span className="w-6 h-6 rounded-full bg-muted border flex items-center justify-center text-muted-foreground shrink-0 z-10">
          {icon}
        </span>
      </span>
      <div className="pl-2">
        <p className="text-sm font-medium leading-snug">{primary}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{secondary}</p>
      </div>
    </div>
  )
}

// ── Helpers ────────────────────────────────────────────────────────────────

const GENDER_OPTIONS = ["Male", "Female", "Non-binary", "Prefer not to say"]
const SOCIAL_KEYS = ["instagram", "facebook", "youtube", "tiktok", "twitter", "website"] as const
const ROLES = ["VISITOR", "MEMBER", "LEADER", "ADMIN"] as const
const ADDRESS_TYPES = ["Home", "Work", "Other"] as const

interface StructuredAddress { type: string; street: string; unit: string }

function parseAddress(raw: string | null): StructuredAddress {
  if (!raw) return { type: "Home", street: "", unit: "" }
  try {
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === "object" && "street" in parsed) return parsed as StructuredAddress
  } catch { /* not JSON — legacy plain string */ }
  return { type: "Home", street: raw, unit: "" }
}

function serializeAddress(addr: StructuredAddress): string | null {
  if (!addr.street) return null
  return JSON.stringify(addr)
}

function formatAddressDisplay(raw: string | null): { type: string; street: string; unit: string } | null {
  if (!raw) return null
  return parseAddress(raw)
}

const ADDRESS_TYPE_ICON: Record<string, React.ElementType> = {
  Home: Home,
  Work: Briefcase,
  Other: MapPin,
}

function computeAge(birthday: string | Date | null): number | null {
  if (!birthday) return null
  const b = new Date(birthday)
  const now = new Date()
  let age = now.getUTCFullYear() - b.getUTCFullYear()
  const m = now.getUTCMonth() - b.getUTCMonth()
  if (m < 0 || (m === 0 && now.getUTCDate() < b.getUTCDate())) age--
  return age
}

function initials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()
}

function resizeImage(file: File, maxSize: number): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const scale = Math.min(1, maxSize / img.width, maxSize / img.height)
        const canvas = document.createElement("canvas")
        canvas.width = Math.round(img.width * scale)
        canvas.height = Math.round(img.height * scale)
        canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL("image/jpeg", 0.85))
      }
      img.src = e.target!.result as string
    }
    reader.readAsDataURL(file)
  })
}

function ColorBadge({ name, color }: { name: string; color: string }) {
  const colors = CATEGORY_COLORS[color] ?? CATEGORY_COLORS["gray"]
  return (
    <span className={`text-xs px-2 py-0.5 rounded font-medium ${colors.bg} ${colors.text}`}>
      {name}
    </span>
  )
}

// ── Family ──────────────────────────────────────────────────────────────────

const RELATIONSHIP_SUGGESTIONS = [
  "Father", "Mother", "Parent", "Guardian",
  "Husband", "Wife", "Spouse", "Partner",
  "Son", "Daughter", "Child",
  "Brother", "Sister", "Sibling",
  "Grandparent", "Grandchild", "Other",
]

function FamilyCard({
  fm, currentUserId, canManage, isAdmin, onUpdateRelationship, onRemove, onRename, onDelete,
}: {
  fm: FamilyMembership
  currentUserId: string
  canManage: boolean
  isAdmin: boolean
  onUpdateRelationship: (familyId: string, rel: string) => Promise<void>
  onRemove: (familyId: string) => Promise<void>
  onRename: (familyId: string, name: string) => Promise<void>
  onDelete: (familyId: string) => Promise<void>
}) {
  const [editName, setEditName] = useState(false)
  const [nameInput, setNameInput] = useState(fm.family.name)
  const [editRel, setEditRel] = useState(false)
  const [relInput, setRelInput] = useState(fm.relationship)

  async function saveName() {
    if (!nameInput.trim()) return
    await onRename(fm.familyId, nameInput.trim())
    setEditName(false)
  }
  async function saveRel() {
    if (!relInput.trim()) return
    await onUpdateRelationship(fm.familyId, relInput.trim())
    setEditRel(false)
  }

  return (
    <div className="border rounded-lg p-3 space-y-2">
      {/* Header row */}
      <div className="flex items-center justify-between gap-2">
        {editName ? (
          <div className="flex items-center gap-1 flex-1">
            <Input value={nameInput} onChange={(e) => setNameInput(e.target.value)} className="h-7 text-sm"
              onKeyDown={(e) => { if (e.key === "Enter") saveName(); if (e.key === "Escape") { setEditName(false); setNameInput(fm.family.name) } }} autoFocus />
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={saveName}><Check className="h-3.5 w-3.5 text-green-600" /></Button>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditName(false); setNameInput(fm.family.name) }}><X className="h-3.5 w-3.5" /></Button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <span className="font-medium text-sm">{fm.family.name}</span>
            {canManage && <button onClick={() => setEditName(true)} className="text-muted-foreground hover:text-foreground"><Pencil className="h-3 w-3" /></button>}
          </div>
        )}
        {isAdmin && (
          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive shrink-0" onClick={() => onDelete(fm.familyId)}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {/* Members list */}
      <div className="divide-y">
        {fm.family.members.map((m) => (
          <div key={m.userId} className="flex items-center gap-2 py-1.5">
            <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium shrink-0 overflow-hidden">
              {m.user.avatar ? <img src={m.user.avatar} alt={m.user.name} className="w-full h-full object-cover" /> : m.user.name.charAt(0).toUpperCase()}
            </div>
            <span className={`text-sm flex-1 ${m.userId === currentUserId ? "font-medium" : ""}`}>{m.user.name}</span>
            {m.userId === currentUserId && canManage ? (
              editRel ? (
                <div className="flex items-center gap-1">
                  <Input value={relInput} onChange={(e) => setRelInput(e.target.value)} className="h-6 text-xs w-28"
                    onKeyDown={(e) => { if (e.key === "Enter") saveRel(); if (e.key === "Escape") setEditRel(false) }} autoFocus />
                  <Button size="icon" variant="ghost" className="h-6 w-6" onClick={saveRel}><Check className="h-3 w-3 text-green-600" /></Button>
                </div>
              ) : (
                <button onClick={() => setEditRel(true)} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                  {m.relationship} <Pencil className="h-2.5 w-2.5" />
                </button>
              )
            ) : (
              <span className="text-xs text-muted-foreground">{m.relationship}</span>
            )}
          </div>
        ))}
      </div>

      {canManage && (
        <button onClick={() => onRemove(fm.familyId)} className="text-xs text-destructive hover:underline">
          Remove from family
        </button>
      )}
    </div>
  )
}

function FamilySection({
  userId, userName, initialFamilies, canManage, isAdmin,
}: {
  userId: string
  userName: string
  initialFamilies: FamilyMembership[]
  canManage: boolean
  isAdmin: boolean
}) {
  const [families, setFamilies] = useState(initialFamilies)
  const [addOpen, setAddOpen] = useState(false)

  // Step 1: person search
  const [search, setSearch] = useState("")
  const [searchResults, setSearchResults] = useState<{ id: string; name: string; avatar: string | null }[]>([])
  const [searching, setSearching] = useState(false)
  const [selectedPerson, setSelectedPerson] = useState<{ id: string; name: string; avatar: string | null } | null>(null)

  // Step 2: relationships + family name
  const [myRole, setMyRole] = useState("")
  const [theirRole, setTheirRole] = useState("")
  const [familyName, setFamilyName] = useState("")
  const [adding, setAdding] = useState(false)

  // Already-in-family user ids (skip in search results)
  const alreadyLinked = useMemo(
    () => new Set(families.flatMap((f) => f.family.members.map((m) => m.userId))),
    [families]
  )
  const existingFamilyId = families[0]?.familyId ?? null

  // Auto-compute family name from whoever is "Father"
  useEffect(() => {
    if (!selectedPerson) return
    const myR = myRole.toLowerCase()
    const theirR = theirRole.toLowerCase()
    if (myR === "father") setFamilyName(`${userName} Family`)
    else if (theirR === "father") setFamilyName(`${selectedPerson.name} Family`)
    else if (!familyName) setFamilyName(`${userName} Family`)
  }, [myRole, theirRole, selectedPerson, userName]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!search.trim()) { setSearchResults([]); return }
    const t = setTimeout(async () => {
      setSearching(true)
      const res = await fetch(`/api/users?search=${encodeURIComponent(search)}&limit=10`)
      if (res.ok) setSearchResults(await res.json())
      setSearching(false)
    }, 300)
    return () => clearTimeout(t)
  }, [search])

  function resetDialog() {
    setAddOpen(false); setSearch(""); setSearchResults([]); setSelectedPerson(null)
    setMyRole(""); setTheirRole(""); setFamilyName(""); setAdding(false)
  }

  async function doLink() {
    if (!selectedPerson) return
    setAdding(true)
    try {
      let targetFamilyId = existingFamilyId

      if (!targetFamilyId) {
        // Create new family
        const name = familyName.trim() || `${userName} Family`
        const res = await fetch("/api/families", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name }),
        })
        if (!res.ok) { toast.error("Failed to create family"); return }
        const fam = await res.json()
        targetFamilyId = fam.id

        // Add current user to new family
        await fetch(`/api/families/${targetFamilyId}/members`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, relationship: myRole.trim() || "Member" }),
        })
      } else if (myRole.trim() && families[0]?.relationship !== myRole.trim()) {
        // Update current user's role in existing family if changed
        await fetch(`/api/families/${targetFamilyId}/members/${userId}`, {
          method: "PATCH", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ relationship: myRole.trim() }),
        })
      }

      // Add selected person
      const addRes = await fetch(`/api/families/${targetFamilyId}/members`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: selectedPerson.id, relationship: theirRole.trim() || "Member" }),
      })
      if (!addRes.ok) {
        const err = await addRes.json()
        toast.error(err.error || "Failed to add member"); return
      }

      // Refresh family data
      const famRes = await fetch(`/api/families/${targetFamilyId}`)
      if (famRes.ok) {
        const fam = await famRes.json()
        setFamilies((prev) => {
          const existing = prev.find((f) => f.familyId === targetFamilyId)
          if (existing) return prev.map((f) => f.familyId === targetFamilyId ? { ...f, family: fam } : f)
          return [...prev, { id: fam.id, familyId: fam.id, relationship: myRole.trim() || "Member", family: fam }]
        })
      }
      toast.success("Family member linked")
      resetDialog()
    } finally {
      setAdding(false)
    }
  }

  async function updateRelationship(familyId: string, rel: string) {
    const res = await fetch(`/api/families/${familyId}/members/${userId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ relationship: rel }),
    })
    if (res.ok) setFamilies((prev) => prev.map((f) => f.familyId === familyId
      ? { ...f, relationship: rel, family: { ...f.family, members: f.family.members.map((m) => m.userId === userId ? { ...m, relationship: rel } : m) } }
      : f))
    else toast.error("Failed to update relationship")
  }

  async function removeFromFamily(familyId: string) {
    if (!confirm("Remove from this family?")) return
    const res = await fetch(`/api/families/${familyId}/members/${userId}`, { method: "DELETE" })
    if (res.ok) { setFamilies((prev) => prev.filter((f) => f.familyId !== familyId)); toast.success("Removed from family") }
    else toast.error("Failed to remove from family")
  }

  async function renameFamily(familyId: string, name: string) {
    const res = await fetch(`/api/families/${familyId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    })
    if (res.ok) setFamilies((prev) => prev.map((f) => f.familyId === familyId ? { ...f, family: { ...f.family, name } } : f))
    else toast.error("Failed to rename family")
  }

  async function deleteFamily(familyId: string) {
    if (!confirm("Delete this entire family? All members will be unlinked.")) return
    const res = await fetch(`/api/families/${familyId}`, { method: "DELETE" })
    if (res.ok) { setFamilies((prev) => prev.filter((f) => f.familyId !== familyId)); toast.success("Family deleted") }
    else toast.error("Failed to delete family")
  }

  function RelChips({ value, onChange }: { value: string; onChange: (v: string) => void }) {
    return (
      <div className="flex flex-wrap gap-1">
        {RELATIONSHIP_SUGGESTIONS.map((r) => (
          <button key={r} type="button" onClick={() => onChange(value === r ? "" : r)}
            className={`text-xs px-2 py-0.5 rounded border transition-colors ${value === r ? "bg-foreground text-background border-transparent" : "hover:bg-muted text-muted-foreground"}`}>
            {r}
          </button>
        ))}
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-muted-foreground">Family</p>
        {canManage && (
          <button onClick={() => setAddOpen(true)} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
            <Plus className="h-3 w-3" /> Add Family Member
          </button>
        )}
      </div>

      {families.length === 0
        ? <p className="text-sm text-muted-foreground">Not linked to any family</p>
        : <div className="space-y-3">
            {families.map((fm) => (
              <FamilyCard key={fm.familyId} fm={fm} currentUserId={userId} canManage={canManage} isAdmin={isAdmin}
                onUpdateRelationship={updateRelationship} onRemove={removeFromFamily}
                onRename={renameFamily} onDelete={deleteFamily} />
            ))}
          </div>
      }

      <Dialog open={addOpen} onOpenChange={(o) => { if (!o) resetDialog(); else setAddOpen(true) }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add Family Member</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-1">
            {/* Step 1: pick a person */}
            {!selectedPerson ? (
              <>
                <Input placeholder="Search members by name…" value={search}
                  onChange={(e) => setSearch(e.target.value)} autoFocus />
                <div className="rounded-md border divide-y max-h-56 overflow-y-auto">
                  {searching && <p className="text-sm text-muted-foreground px-3 py-2">Searching…</p>}
                  {!searching && search.trim() && searchResults.length === 0 && (
                    <p className="text-sm text-muted-foreground px-3 py-2">No members found</p>
                  )}
                  {searchResults
                    .filter((u) => u.id !== userId && !alreadyLinked.has(u.id))
                    .map((u) => (
                      <button key={u.id} className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center gap-2"
                        onClick={() => { setSelectedPerson(u); setFamilyName(`${userName} Family`) }}>
                        <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium shrink-0 overflow-hidden">
                          {u.avatar ? <img src={u.avatar} alt={u.name} className="w-full h-full object-cover" /> : u.name.charAt(0).toUpperCase()}
                        </div>
                        {u.name}
                      </button>
                    ))}
                  {!search.trim() && <p className="text-sm text-muted-foreground px-3 py-2">Type a name to search</p>}
                </div>
              </>
            ) : (
              /* Step 2: set relationships */
              <>
                {/* Selected person chip */}
                <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded text-sm">
                  <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium shrink-0 overflow-hidden">
                    {selectedPerson.avatar ? <img src={selectedPerson.avatar} alt={selectedPerson.name} className="w-full h-full object-cover" /> : selectedPerson.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="flex-1 font-medium">{selectedPerson.name}</span>
                  <button className="text-xs text-muted-foreground hover:text-foreground" onClick={() => { setSelectedPerson(null); setMyRole(""); setTheirRole(""); setFamilyName("") }}>Change</button>
                </div>

                {/* Their relationship */}
                <div className="space-y-1.5">
                  <Label className="text-xs">{selectedPerson.name}&apos;s role</Label>
                  <RelChips value={theirRole} onChange={setTheirRole} />
                  <Input placeholder="Or type a custom role…" value={theirRole}
                    onChange={(e) => setTheirRole(e.target.value)} className="h-7 text-sm" />
                </div>

                {/* My relationship */}
                <div className="space-y-1.5">
                  <Label className="text-xs">{userName}&apos;s role</Label>
                  <RelChips value={myRole} onChange={setMyRole} />
                  <Input placeholder="Or type a custom role…" value={myRole}
                    onChange={(e) => setMyRole(e.target.value)} className="h-7 text-sm" />
                </div>

                {/* Family name (only shown when creating new) */}
                {!existingFamilyId && (
                  <div className="space-y-1.5">
                    <Label className="text-xs">Family name</Label>
                    <Input value={familyName} onChange={(e) => setFamilyName(e.target.value)} className="h-8 text-sm" />
                  </div>
                )}

                <Button onClick={doLink} disabled={adding} className="w-full">
                  {adding ? "Linking…" : "Link as Family"}
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────

export default function UserProfile({
  user: initUser, allTeams, allMemberCategories, allMinistries, sessionRole, sessionId, timezone, givingHistory,
}: Props) {
  const [user, setUser] = useState(initUser)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle")
  const [timelineFilter, setTimelineFilter] = useState<TimelineFilter>("all")

  const isAdmin = sessionRole === "ADMIN"
  const isLeader = sessionRole === "LEADER"
  const isSelf = sessionId === user.id
  const canEdit = isAdmin || isLeader || isSelf

  // Form state
  const [form, setForm] = useState({
    name: user.name,
    email: user.email,
    phone: user.phone ?? "",
    birthday: user.birthday ? new Date(user.birthday).toISOString().split("T")[0] : "",
    address: parseAddress(user.address),
    gender: user.gender ?? "",
    role: user.role,
    social: { instagram: "", facebook: "", youtube: "", tiktok: "", twitter: "", website: "", ...(user.socialProfiles ?? {}) },
    teamIds: user.teamMemberships.map((m) => m.team.id),
    avatar: user.avatar as string | null,
    memberCategoryId: user.memberCategory?.id ?? null as string | null,
    ministryId: user.ministry?.id ?? null as string | null,
    canViewGiving: user.canViewGiving ?? false,
  })

  const avatarRef = useRef<HTMLInputElement>(null)
  const handleSaveRef = useRef<(() => Promise<void>) | undefined>(undefined)

  useEffect(() => {
    if (!editing) return
    setSaveStatus("saving")
    const timer = setTimeout(() => { handleSaveRef.current?.() }, 800)
    return () => clearTimeout(timer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing, form.name, form.email, form.phone, form.birthday, form.address, form.gender, form.role,
      JSON.stringify(form.social), JSON.stringify(form.teamIds), form.avatar,
      form.memberCategoryId, form.ministryId, form.canViewGiving])

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { toast.error("Image must be under 5MB"); return }
    const dataUrl = await resizeImage(file, 256)
    setForm((f) => ({ ...f, avatar: dataUrl }))
    e.target.value = ""
  }

  // Notes state
  const [notes, setNotes] = useState<ProfileNote[]>(user.profileNotes ?? [])
  const [newNote, setNewNote] = useState("")
  const [addingNote, setAddingNote] = useState(false)

  function resetForm() {
    setForm({
      name: user.name, email: user.email, phone: user.phone ?? "",
      birthday: user.birthday ? new Date(user.birthday).toISOString().split("T")[0] : "",
      address: parseAddress(user.address), gender: user.gender ?? "", role: user.role,
      social: { instagram: "", facebook: "", youtube: "", tiktok: "", twitter: "", website: "", ...(user.socialProfiles ?? {}) },
      teamIds: user.teamMemberships.map((m) => m.team.id),
      avatar: user.avatar as string | null,
      memberCategoryId: user.memberCategory?.id ?? null,
      ministryId: user.ministry?.id ?? null,
      canViewGiving: user.canViewGiving ?? false,
    })
    setEditing(false)
  }

  const handleSave = useCallback(async () => {
    setSaving(true)
    setSaveStatus("saving")
    const res = await fetch(`/api/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        email: isAdmin ? form.email : undefined,
        phone: form.phone || null,
        birthday: form.birthday || null,
        address: serializeAddress(form.address),
        gender: form.gender || null,
        socialProfiles: Object.fromEntries(Object.entries(form.social).filter(([, v]) => v)),
        role: isAdmin ? form.role : undefined,
        teamIds: isAdmin ? form.teamIds : undefined,
        avatar: form.avatar,
        memberCategoryId: (isAdmin || isLeader) ? (form.memberCategoryId || null) : undefined,
        ministryId: (isAdmin || isLeader) ? (form.ministryId || null) : undefined,
        canViewGiving: isAdmin ? form.canViewGiving : undefined,
      }),
    })
    setSaving(false)
    if (res.ok) {
      const updated = await res.json()
      const newCategory = allMemberCategories.find((c) => c.id === form.memberCategoryId) ?? null
      const newMinistry = allMinistries.find((m) => m.id === form.ministryId) ?? null
      setUser((prev) => ({
        ...prev, ...updated,
        memberCategory: newCategory,
        ministry: newMinistry,
        teamMemberships: isAdmin
          ? allTeams.filter((t) => form.teamIds.includes(t.id)).map((t) => ({
              team: t,
              isLeader: prev.teamMemberships.find((m) => m.team.id === t.id)?.isLeader ?? false,
              joinedAt: prev.teamMemberships.find((m) => m.team.id === t.id)?.joinedAt,
            }))
          : prev.teamMemberships,
      }))
      setSaveStatus("saved")
    } else {
      setSaveStatus("idle")
      toast.error("Failed to save profile")
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id, form, isAdmin, isLeader, allTeams, allMemberCategories, allMinistries])

  useEffect(() => { handleSaveRef.current = handleSave }, [handleSave])

  async function addNote() {
    if (!newNote.trim()) return
    setAddingNote(true)
    const res = await fetch(`/api/users/${user.id}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: newNote }),
    })
    setAddingNote(false)
    if (res.ok) {
      const note = await res.json()
      setNotes([note, ...notes])
      setNewNote("")
      toast.success("Note added")
    } else {
      toast.error("Failed to add note")
    }
  }

  async function deleteNote(noteId: string) {
    await fetch(`/api/users/${user.id}/notes/${noteId}`, { method: "DELETE" })
    setNotes(notes.filter((n) => n.id !== noteId))
    toast.success("Note deleted")
  }

  async function toggleLeader(teamId: string, isLeaderNow: boolean) {
    const res = await fetch(`/api/team-members/${teamId}/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isLeader: !isLeaderNow }),
    })
    if (res.ok) {
      setUser((prev) => ({
        ...prev,
        teamMemberships: prev.teamMemberships.map((m) =>
          m.team.id === teamId ? { ...m, isLeader: !isLeaderNow } : m
        ),
      }))
      toast.success(isLeaderNow ? "Leader removed" : "Leader assigned")
    } else {
      toast.error("Failed to update leader")
    }
  }

  const age = computeAge(user.birthday)

  const timeline = useMemo(() => buildTimeline(user), [user])
  const filteredTimeline = useMemo(
    () => timeline.filter((item) => matchesFilter(item, timelineFilter)),
    [timeline, timelineFilter]
  )

  return (
    <div className="space-y-4 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/mychurch/users" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
          <ChevronLeft className="h-4 w-4" /> Church
        </Link>
      </div>

      {/* Profile card header */}
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold shrink-0 overflow-hidden">
          {(editing ? form.avatar : user.avatar)
            ? <img src={(editing ? form.avatar : user.avatar)!} alt={user.name} className="w-full h-full object-cover" />
            : initials(user.name)
          }
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold truncate">{user.name}</h1>
          <p className="text-sm text-muted-foreground">{user.email}</p>
          <div className="flex flex-wrap items-center gap-1.5 mt-1">
            <span className={`text-xs px-2 py-0.5 rounded font-medium ${ROLE_BADGE[editing ? form.role : user.role] ?? ROLE_BADGE.MEMBER}`}>
              {(editing ? form.role : user.role).charAt(0) + (editing ? form.role : user.role).slice(1).toLowerCase()}
            </span>
            {user.memberCategory && <ColorBadge name={user.memberCategory.name} color={user.memberCategory.color} />}
            {user.ministry && <ColorBadge name={user.ministry.name} color={user.ministry.color} />}
          </div>
        </div>
        {canEdit && !editing && (
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
          </Button>
        )}
      </div>

      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info">Info</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          {isAdmin && <TabsTrigger value="notes">Notes</TabsTrigger>}
          {(isAdmin || isSelf) && <TabsTrigger value="giving">Giving</TabsTrigger>}
          {isSelf && <TabsTrigger value="login">Login</TabsTrigger>}
        </TabsList>

        {/* ── INFO TAB ── */}
        <TabsContent value="info" className="space-y-4 mt-4">
          {editing ? (
            <Card>
              <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base">Edit Profile</CardTitle>
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={resetForm}>
                  <X className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Avatar upload */}
                <div className="flex items-center gap-4 pb-2 border-b">
                  <div
                    className="w-16 h-16 rounded-full bg-primary/10 text-primary relative cursor-pointer group overflow-hidden ring-2 ring-primary/20 shrink-0"
                    onClick={() => avatarRef.current?.click()}
                  >
                    {form.avatar
                      ? <img src={form.avatar} alt="" className="w-full h-full object-cover" />
                      : <span className="absolute inset-0 flex items-center justify-center text-xl font-bold">{initials(user.name)}</span>
                    }
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-full">
                      <Camera className="h-5 w-5 text-white" />
                    </div>
                  </div>
                  <input ref={avatarRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                  <div>
                    <p className="text-sm font-medium">Profile Photo</p>
                    <p className="text-xs text-muted-foreground">Click to upload · JPEG, PNG · Max 5MB</p>
                    {form.avatar && (
                      <button
                        type="button"
                        className="text-xs text-destructive hover:underline mt-1"
                        onClick={() => setForm((f) => ({ ...f, avatar: null }))}
                      >
                        Remove photo
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Field label="Name">
                    <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                  </Field>
                  {isAdmin && (
                    <Field label="Email">
                      <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                    </Field>
                  )}
                  <Field label="Phone">
                    <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+1 (555) 000-0000" />
                  </Field>
                  <Field label={`Birthday${age != null ? ` (age ${age})` : ""}`}>
                    <Input type="date" value={form.birthday} onChange={(e) => setForm({ ...form, birthday: e.target.value })} />
                  </Field>
                  <Field label="Gender">
                    <Select value={form.gender} onValueChange={(v) => setForm({ ...form, gender: v })}>
                      <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                      <SelectContent>
                        {GENDER_OPTIONS.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </Field>
                  {isAdmin && (
                    <Field label="Role / Permission">
                      <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </Field>
                  )}
                  {(isAdmin || isLeader) && (
                    <>
                      <Field label="Member Category">
                        <Select
                          value={form.memberCategoryId ?? "none"}
                          onValueChange={(v) => setForm({ ...form, memberCategoryId: v === "none" ? null : v })}
                        >
                          <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            {allMemberCategories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </Field>
                      <Field label="Ministry">
                        <Select
                          value={form.ministryId ?? "none"}
                          onValueChange={(v) => setForm({ ...form, ministryId: v === "none" ? null : v })}
                        >
                          <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            {allMinistries.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </Field>
                    </>
                  )}
                </div>

                <Field label="Address">
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      {ADDRESS_TYPES.map((t) => {
                        const Icon = ADDRESS_TYPE_ICON[t]
                        return (
                          <button
                            key={t}
                            type="button"
                            onClick={() => setForm({ ...form, address: { ...form.address, type: t } })}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs font-medium transition-colors ${form.address.type === t ? "bg-primary text-primary-foreground border-primary" : "text-muted-foreground hover:bg-muted"}`}
                          >
                            <Icon className="h-3.5 w-3.5" />{t}
                          </button>
                        )
                      })}
                    </div>
                    <LocationSearch
                      value={form.address.street}
                      onChange={(v) => setForm({ ...form, address: { ...form.address, street: v } })}
                      placeholder="Search street address…"
                    />
                    <Input
                      value={form.address.unit}
                      onChange={(e) => setForm({ ...form, address: { ...form.address, unit: e.target.value } })}
                      placeholder="Apt, unit, suite… (optional)"
                    />
                  </div>
                </Field>

                <div className="space-y-2">
                  <p className="text-sm font-medium">Social Profiles</p>
                  <div className="grid grid-cols-2 gap-3">
                    {SOCIAL_KEYS.map((key) => (
                      <Field key={key} label={key.charAt(0).toUpperCase() + key.slice(1)}>
                        <Input
                          value={form.social[key]}
                          onChange={(e) => setForm({ ...form, social: { ...form.social, [key]: e.target.value } })}
                          placeholder={key === "website" ? "https://…" : `@username`}
                        />
                      </Field>
                    ))}
                  </div>
                </div>

                {isAdmin && (
                  <>
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Teams</p>
                      <div className="grid grid-cols-2 gap-2">
                        {allTeams.map((team) => {
                          const checked = form.teamIds.includes(team.id)
                          return (
                            <label key={team.id} className="flex items-center gap-2 text-sm cursor-pointer">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => setForm({
                                  ...form,
                                  teamIds: checked
                                    ? form.teamIds.filter((id) => id !== team.id)
                                    : [...form.teamIds, team.id],
                                })}
                                className="rounded"
                              />
                              {team.name}
                            </label>
                          )
                        })}
                      </div>
                    </div>
                    <div className="space-y-1.5 border-t pt-3">
                      <p className="text-sm font-medium">Access</p>
                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <input
                          type="checkbox"
                          checked={form.canViewGiving}
                          onChange={() => setForm({ ...form, canViewGiving: !form.canViewGiving })}
                          className="rounded"
                        />
                        <Heart className="h-3.5 w-3.5 text-muted-foreground" />
                        Can view the giving dashboard
                      </label>
                    </div>
                  </>
                )}

                {(saveStatus === "saving" || saveStatus === "saved") && (
                  <p className="text-xs text-muted-foreground pt-1">
                    {saveStatus === "saving" ? "Saving…" : "Saved"}
                  </p>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                <InfoRow label="Phone" value={user.phone} />
                <InfoRow label={`Birthday${age != null ? ` · Age ${age}` : ""}`} value={user.birthday ? new Date(user.birthday).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" }) : null} />
                <InfoRow label="Gender" value={user.gender} />
                {isAdmin && <InfoRow label="Role" value={user.role.charAt(0) + user.role.slice(1).toLowerCase()} />}
                {user.memberCategory && (
                  <div>
                    <p className="text-xs text-muted-foreground">Member Category</p>
                    <div className="mt-0.5"><ColorBadge name={user.memberCategory.name} color={user.memberCategory.color} /></div>
                  </div>
                )}
                {user.ministry && (
                  <div>
                    <p className="text-xs text-muted-foreground">Ministry</p>
                    <div className="mt-0.5"><ColorBadge name={user.ministry.name} color={user.ministry.color} /></div>
                  </div>
                )}
              </div>
              {user.address && (() => {
                const addr = formatAddressDisplay(user.address)
                if (!addr || !addr.street) return null
                const Icon = ADDRESS_TYPE_ICON[addr.type] ?? MapPin
                return (
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Address</p>
                    <div className="flex items-start gap-1.5 text-sm">
                      <Icon className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground" />
                      <div>
                        <span className="text-xs text-muted-foreground mr-1.5">{addr.type}</span>
                        <span>{addr.street}{addr.unit ? `, ${addr.unit}` : ""}</span>
                      </div>
                    </div>
                  </div>
                )
              })()}
              {user.socialProfiles && Object.keys(user.socialProfiles).length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Social Profiles</p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(user.socialProfiles).filter(([, v]) => v).map(([key, value]) => (
                      <span key={key} className="text-xs bg-muted px-2 py-1 rounded">
                        <span className="text-muted-foreground capitalize">{key}: </span>{value}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Teams */}
              <div>
                <p className="text-xs text-muted-foreground mb-1">Teams</p>
                {user.teamMemberships.length === 0
                  ? <p className="text-sm text-muted-foreground">Not on any teams</p>
                  : <div className="space-y-1.5">
                      {user.teamMemberships.map((m) => (
                        <div key={m.team.id} className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">{m.team.name}</Badge>
                            {m.isLeader && <span className="text-xs text-muted-foreground">Leader</span>}
                          </div>
                          {isAdmin && (
                            <Button
                              variant="outline" size="sm" className="h-6 text-xs px-2"
                              onClick={() => toggleLeader(m.team.id, m.isLeader)}
                            >
                              {m.isLeader ? "Remove as leader" : "Set as leader"}
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                }
              </div>

              {/* Groups */}
              <div>
                <p className="text-xs text-muted-foreground mb-1">Groups</p>
                {user.groupMemberships.length === 0
                  ? <p className="text-sm text-muted-foreground">Not in any groups</p>
                  : <div className="flex flex-wrap gap-1.5">
                      {user.groupMemberships.map((m) => (
                        <div key={m.group.id} className="flex items-center gap-1">
                          <Badge variant="secondary">{m.group.name}</Badge>
                          {m.role === "LEADER" && <span className="text-xs text-muted-foreground">Leader</span>}
                        </div>
                      ))}
                    </div>
                }
              </div>

              {/* Family */}
              <FamilySection
                userId={user.id}
                userName={user.name}
                initialFamilies={user.familyMemberships}
                canManage={isAdmin || isLeader}
                isAdmin={isAdmin}
              />
            </div>
          )}
        </TabsContent>

        {/* ── ACTIVITY TAB ── */}
        <TabsContent value="activity" className="mt-4">
          {/* Filter chips */}
          <div className="flex gap-2 mb-5 flex-wrap">
            {(["all", "joined", "service", "events"] as TimelineFilter[]).map((f) => (
              <button
                key={f}
                onClick={() => setTimelineFilter(f)}
                className={`text-xs px-3 py-1 rounded-full border transition-colors capitalize ${
                  timelineFilter === f
                    ? "bg-primary text-primary-foreground border-primary"
                    : "hover:bg-accent"
                }`}
              >
                {f === "all" ? "All" : f === "joined" ? "Joined" : f === "service" ? "Service" : "Events"}
              </button>
            ))}
          </div>

          {/* Timeline */}
          <div className="relative border-l ml-3 pl-6 space-y-0">
            {filteredTimeline.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 pl-2">No activity to show.</p>
            ) : (
              filteredTimeline.map((item, i) => (
                <TimelineItem key={i} item={item} timezone={timezone} />
              ))
            )}
          </div>
        </TabsContent>

        {/* ── NOTES TAB (ADMIN only) ── */}
        {isAdmin && (
          <TabsContent value="notes" className="mt-4 space-y-3">
            <div className="flex gap-2">
              <Textarea
                placeholder="Add an admin note about this person…"
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                rows={2}
                className="text-sm"
              />
              <Button size="sm" className="shrink-0 self-end" onClick={addNote} disabled={addingNote || !newNote.trim()}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Add
              </Button>
            </div>
            {notes.length === 0
              ? <p className="text-sm text-muted-foreground text-center py-6">No notes yet.</p>
              : <div className="space-y-2">
                  {notes.map((note) => (
                    <Card key={note.id}>
                      <CardContent className="px-4 py-3">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm whitespace-pre-wrap flex-1">{note.content}</p>
                          <Button
                            variant="ghost" size="icon" className="h-7 w-7 text-destructive shrink-0"
                            onClick={() => deleteNote(note.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1.5">
                          {note.author.name} · {new Date(note.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: timezone })}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
            }
          </TabsContent>
        )}

        {/* ── GIVING TAB ── */}
        {(isAdmin || isSelf) && (
          <TabsContent value="giving" className="mt-4 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <p className="text-sm text-muted-foreground">
                {givingHistory.length > 0 ? `${givingHistory.length} record${givingHistory.length > 1 ? "s" : ""} on file` : "No giving records found."}
              </p>
              {givingHistory.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  {Array.from(new Set(givingHistory.map(o => new Date(o.createdAt).getFullYear()))).sort((a, b) => b - a).map(year => (
                    <Link
                      key={year}
                      href={`/mychurch/giving/statement?userId=${user.id}&year=${year}`}
                      target="_blank"
                    >
                      <Button variant="outline" size="sm">
                        <FileText className="h-3.5 w-3.5 mr-1.5" />
                        {year} Tax Statement
                      </Button>
                    </Link>
                  ))}
                </div>
              )}
            </div>
            {givingHistory.length > 0 && (
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Fund</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Recurring</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {givingHistory.map(o => (
                        <TableRow key={o.id}>
                          <TableCell className="text-sm whitespace-nowrap">
                            {new Date(o.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          </TableCell>
                          <TableCell className="text-sm">{o.category?.name ?? o.type ?? "General"}</TableCell>
                          <TableCell className="font-medium text-sm">${(o.amount / 100).toFixed(2)}</TableCell>
                          <TableCell>
                            {o.recurring && <Badge variant="secondary" className="text-xs">Monthly</Badge>}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        )}

        {/* ── LOGIN TAB ── */}
        {isSelf && (
          <TabsContent value="login" className="mt-4">
            <LoginTab />
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────

function LoginTab() {
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [saving, setSaving] = useState(false)

  async function savePassword() {
    if (!newPassword || !currentPassword) return
    if (newPassword !== confirmPassword) { toast.error("Passwords do not match"); return }
    if (newPassword.length < 8) { toast.error("Password must be at least 8 characters"); return }
    setSaving(true)
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? "Failed to update password"); return }
      toast.success("Password updated")
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("")
    } catch {
      toast.error("Failed to update password")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Change Password</CardTitle></CardHeader>
      <CardContent className="space-y-4 max-w-sm">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Current password</label>
          <Input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">New password</label>
          <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Confirm new password</label>
          <Input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && savePassword()}
          />
        </div>
        <Button onClick={savePassword} disabled={saving || !currentPassword || !newPassword || !confirmPassword}>
          {saving ? "Updating…" : "Update password"}
        </Button>
      </CardContent>
    </Card>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      {children}
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm">{value}</p>
    </div>
  )
}
