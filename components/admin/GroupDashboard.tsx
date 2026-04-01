"use client"

import { useState, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import ChannelLinksCard from "@/components/admin/ChannelLinksCard"
import ChannelPinsCard from "@/components/admin/ChannelPinsCard"
// Tabs still used for Events/Members dashboard tabs
import {
  MessageSquare, Settings, Users, CalendarDays, Plus, Trash2, Pencil,
  UserPlus, Crown, UserMinus, Clock, Globe, X, Check, ChevronDown, ChevronUp,
  Repeat2, Upload, Download, Lock, UserCheck, Archive, Megaphone,
} from "lucide-react"

// ── Types ──────────────────────────────────────────────────────────────────

interface User { id: string; name: string; email: string; avatar: string | null }
interface Category { id: string; name: string }
interface Channel { id: string; name: string }

interface AttendanceRecord {
  id: string
  userId: string
  present: boolean
  note: string | null
  user: { id: string; name: string; avatar: string | null }
}

interface GroupEvent {
  id: string
  title: string
  description: string | null
  startDate: Date | string
  endDate: Date | string | null
  recurrence: "NONE" | "WEEKLY" | "BIWEEKLY"
  recurrenceEndDate: Date | string | null
  attendance: AttendanceRecord[]
}

interface GroupMember {
  id: string
  userId: string
  role: "LEADER" | "MEMBER"
  user: User
}

interface Group {
  id: string
  name: string
  description: string | null
  imageUrl: string | null
  imageFocalX: number | null
  imageFocalY: number | null
  archivedAt: string | null
  groupType: string | null
  showOnFrontPage: boolean
  registration: "OPEN" | "CLOSED" | "REQUEST_TO_JOIN"
  openTime: string | null
  closeTime: string | null
  categoryId: string | null
  category: Category | null
  channels: Channel[]
  members: GroupMember[]
  events: GroupEvent[]
}

interface GroupBroadcast {
  id: string
  title: string
  content: string
  categoryId: string | null
  author: { id: string; name: string; avatar: string | null }
  createdAt: string
}

interface Props {
  group: Group
  categories: Category[]
  allUsers: User[]
  allChannels: Channel[]
  currentUserId: string
  sessionRole: string
  broadcasts: GroupBroadcast[]
}

// ── Helpers ────────────────────────────────────────────────────────────────

function initials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)
}

function Avatar({ user, size = "sm" }: { user: { name: string; avatar: string | null }; size?: "sm" | "md" }) {
  const cls = size === "md" ? "h-9 w-9 text-xs" : "h-7 w-7 text-[10px]"
  return (
    <div className={`${cls} rounded-full bg-secondary flex items-center justify-center font-semibold shrink-0 overflow-hidden`}>
      {user.avatar
        ? <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
        : initials(user.name)
      }
    </div>
  )
}

function icalDate(d: Date) {
  return d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z"
}

function exportIcal(ev: GroupEvent) {
  const start = new Date(ev.startDate)
  const end = ev.endDate ? new Date(ev.endDate) : new Date(start.getTime() + 60 * 60 * 1000)
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Ordinary Ministry//EN",
    "BEGIN:VEVENT",
    `UID:${ev.id}@ordinaryministry`,
    `DTSTAMP:${icalDate(new Date())}`,
    `DTSTART:${icalDate(start)}`,
    `DTEND:${icalDate(end)}`,
    `SUMMARY:${ev.title}`,
    ev.description ? `DESCRIPTION:${ev.description.replace(/\n/g, "\\n")}` : null,
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean).join("\r\n")
  const blob = new Blob([lines], { type: "text/calendar" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a"); a.href = url; a.download = `${ev.title}.ics`; a.click()
  URL.revokeObjectURL(url)
}

function exportGcal(ev: GroupEvent) {
  const start = new Date(ev.startDate)
  const end = ev.endDate ? new Date(ev.endDate) : new Date(start.getTime() + 60 * 60 * 1000)
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: ev.title,
    dates: `${icalDate(start)}/${icalDate(end)}`,
    details: ev.description || "",
  })
  window.open(`https://calendar.google.com/calendar/render?${params}`, "_blank")
}

function fmtDate(d: Date | string) {
  return new Date(d).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })
}

function recurrenceLabel(r: string) {
  if (r === "WEEKLY") return "Weekly"
  if (r === "BIWEEKLY") return "Every 2 weeks"
  return null
}

// ── Event Form Dialog ──────────────────────────────────────────────────────

function EventFormDialog({
  groupId, event, onSave, onClose,
}: {
  groupId: string
  event: GroupEvent | null
  onSave: (ev: GroupEvent) => void
  onClose: () => void
}) {
  const [title, setTitle] = useState(event?.title ?? "")
  const [description, setDescription] = useState(event?.description ?? "")
  const [startDate, setStartDate] = useState(
    event?.startDate ? new Date(event.startDate).toISOString().slice(0, 16) : ""
  )
  const [endDate, setEndDate] = useState(
    event?.endDate ? new Date(event.endDate).toISOString().slice(0, 16) : ""
  )
  const [recurrence, setRecurrence] = useState(event?.recurrence ?? "NONE")
  const [recurrenceEndDate, setRecurrenceEndDate] = useState(
    event?.recurrenceEndDate ? new Date(event.recurrenceEndDate).toISOString().slice(0, 10) : ""
  )
  const [saving, setSaving] = useState(false)

  async function save() {
    if (!title.trim() || !startDate) return
    setSaving(true)
    const url = event
      ? `/api/groups/${groupId}/events/${event.id}`
      : `/api/groups/${groupId}/events`
    const res = await fetch(url, {
      method: event ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title, description: description || null,
        startDate, endDate: endDate || null,
        recurrence, recurrenceEndDate: recurrenceEndDate || null,
      }),
    })
    setSaving(false)
    if (res.ok) {
      const ev = await res.json()
      onSave(ev)
      toast.success(event ? "Event updated" : "Event created")
      onClose()
    } else {
      toast.error("Failed to save event")
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{event ? "Edit Event" : "New Event"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1">
            <Label>Title *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Weekly Meeting" autoFocus />
          </div>
          <div className="space-y-1">
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Start *</Label>
              <Input type="datetime-local" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>End</Label>
              <Input type="datetime-local" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Recurrence</Label>
            <Select value={recurrence} onValueChange={(v) => setRecurrence(v as typeof recurrence)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="NONE">One-time</SelectItem>
                <SelectItem value="WEEKLY">Weekly</SelectItem>
                <SelectItem value="BIWEEKLY">Every 2 weeks</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {recurrence !== "NONE" && (
            <div className="space-y-1">
              <Label>Repeat until</Label>
              <Input type="date" value={recurrenceEndDate} onChange={(e) => setRecurrenceEndDate(e.target.value)} />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={saving || !title.trim() || !startDate}>
            {event ? "Save" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Attendance Dialog ──────────────────────────────────────────────────────

function AttendanceDialog({
  groupId, event, members, onClose, onUpdate,
}: {
  groupId: string
  event: GroupEvent
  members: GroupMember[]
  onClose: () => void
  onUpdate: (ev: GroupEvent) => void
}) {
  const [saving, setSaving] = useState<string | null>(null)

  // Build map from userId -> attendance record
  const attendanceMap = Object.fromEntries(event.attendance.map((a) => [a.userId, a]))

  async function toggle(userId: string) {
    const current = attendanceMap[userId]
    const present = current ? !current.present : true
    setSaving(userId)
    const res = await fetch(`/api/groups/${groupId}/events/${event.id}/attendance`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, present }),
    })
    setSaving(null)
    if (res.ok) {
      const record = await res.json()
      const newAttendance = [
        ...event.attendance.filter((a) => a.userId !== userId),
        record,
      ]
      onUpdate({ ...event, attendance: newAttendance })
    } else {
      toast.error("Failed to update attendance")
    }
  }

  // Use members list; fall back to attendance records for non-members
  const allPeople = [
    ...members.map((m) => m.user),
    ...event.attendance
      .filter((a) => !members.find((m) => m.userId === a.userId))
      .map((a) => a.user),
  ]

  const present = allPeople.filter((u) => attendanceMap[u.id]?.present === true).length
  const total = allPeople.length

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Attendance — {event.title}</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground -mt-1">{fmtDate(event.startDate)}</p>
        <div className="flex items-center justify-between text-sm font-medium mb-2">
          <span className="text-muted-foreground">{present} / {total} present</span>
        </div>
        <div className="space-y-1 max-h-72 overflow-y-auto">
          {allPeople.map((user) => {
            const rec = attendanceMap[user.id]
            const isPresent = rec?.present ?? false
            return (
              <button
                key={user.id}
                onClick={() => toggle(user.id)}
                disabled={saving === user.id}
                className={`w-full flex items-center gap-3 p-2 rounded-lg border transition-colors text-left ${
                  isPresent
                    ? "border-green-200 bg-green-50 dark:bg-green-950/30 dark:border-green-800"
                    : rec
                    ? "border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-800"
                    : "border-transparent hover:bg-accent"
                }`}
              >
                <Avatar user={user} />
                <span className="flex-1 text-sm font-medium">{user.name}</span>
                <span className={`text-xs font-medium ${
                  isPresent ? "text-green-600 dark:text-green-400"
                  : rec ? "text-red-500 dark:text-red-400"
                  : "text-muted-foreground"
                }`}>
                  {isPresent ? "Present" : rec ? "Absent" : "—"}
                </span>
                {saving === user.id && <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />}
              </button>
            )
          })}
          {allPeople.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">No members in group yet.</p>
          )}
        </div>
        <DialogFooter>
          <Button onClick={onClose}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Settings Sheet ─────────────────────────────────────────────────────────

function SettingsSheet({
  group, categories, allChannels, onClose, onUpdate, onDelete, onArchive,
}: {
  group: Group
  categories: Category[]
  allChannels: Channel[]
  onClose: () => void
  onUpdate: (g: Group) => void
  onDelete: () => void
  onArchive: () => void
}) {
  const [name, setName] = useState(group.name)
  const [groupType, setGroupType] = useState(group.groupType ?? "")
  const [imageUrl, setImageUrl] = useState(group.imageUrl ?? "")
  const [focalX, setFocalX] = useState(group.imageFocalX ?? 0.5)
  const [focalY, setFocalY] = useState(group.imageFocalY ?? 0.5)
  const [categoryId, setCategoryId] = useState(group.categoryId ?? "none")
  const [showOnFrontPage, setShowOnFrontPage] = useState(group.showOnFrontPage)
  const [openDate, setOpenDate] = useState(group.openTime ?? "")
  const [closeDate, setCloseDate] = useState(group.closeTime ?? "")
  const [registration, setRegistration] = useState(group.registration ?? "OPEN")
  const [linkedChannelId, setLinkedChannelId] = useState(group.channels[0]?.id ?? "none")
  const [uploading, setUploading] = useState(false)
  const [creatingChat, setCreatingChat] = useState(false)
  const [saving, setSaving] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function uploadImage(file: File) {
    setUploading(true)
    const fd = new FormData(); fd.append("file", file)
    const res = await fetch("/api/uploads", { method: "POST", body: fd })
    setUploading(false)
    if (res.ok) { const { url } = await res.json(); setImageUrl(url) }
    else toast.error("Upload failed")
  }

  async function save() {
    setSaving(true)
    const res = await fetch(`/api/groups/${group.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        imageUrl: imageUrl || null,
        imageFocalX: imageUrl ? focalX : null,
        imageFocalY: imageUrl ? focalY : null,
        groupType: groupType || null,
        showOnFrontPage,
        registration,
        openTime: openDate || null,
        closeTime: closeDate || null,
        categoryId: categoryId === "none" ? null : categoryId,
      }),
    })
    setSaving(false)
    if (res.ok) {
      const updated = await res.json()
      onUpdate(updated)
      toast.success("Settings saved")
    } else {
      toast.error("Failed to save")
    }
  }

  async function linkChannel(channelId: string) {
    const newId = channelId === "none" ? null : channelId
    const res = await fetch(`/api/groups/${group.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channelId: newId }),
    })
    if (res.ok) {
      const updated = await res.json()
      onUpdate(updated)
      setLinkedChannelId(channelId)
      toast.success(newId ? "Channel linked" : "Channel unlinked")
    }
  }

  async function createChat() {
    setCreatingChat(true)
    const slug = group.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
    const res = await fetch("/api/channels", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: slug || "group-chat", type: "GROUP", groupId: group.id }),
    })
    if (!res.ok) { toast.error("Failed to create chat"); setCreatingChat(false); return }
    const channel = await res.json()
    // Link the new channel to the group
    const linkRes = await fetch(`/api/groups/${group.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channelId: channel.id }),
    })
    setCreatingChat(false)
    if (linkRes.ok) {
      const updated = await linkRes.json()
      onUpdate(updated)
      setLinkedChannelId(channel.id)
      toast.success("Chat created and linked")
    } else {
      toast.error("Chat created but failed to link")
    }
  }

  return (
    <Sheet open onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-md flex flex-col">
        <SheetHeader className="px-6 pt-6 pb-4 border-b shrink-0">
          <SheetTitle>Group Settings</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Image + focal point */}
          <div className="space-y-2">
            <Label>Group Image</Label>
            {imageUrl ? (
              <div className="space-y-2">
                {/* Focal point picker */}
                <div
                  className="relative h-40 rounded-lg overflow-hidden bg-muted cursor-crosshair select-none"
                  title="Click to set focal point"
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect()
                    setFocalX(Math.round(((e.clientX - rect.left) / rect.width) * 100) / 100)
                    setFocalY(Math.round(((e.clientY - rect.top) / rect.height) * 100) / 100)
                  }}
                >
                  <img
                    src={imageUrl}
                    alt="Group"
                    className="w-full h-full object-cover pointer-events-none"
                    style={{ objectPosition: `${focalX * 100}% ${focalY * 100}%` }}
                  />
                  {/* Focal point indicator */}
                  <div
                    className="absolute w-5 h-5 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                    style={{ left: `${focalX * 100}%`, top: `${focalY * 100}%` }}
                  >
                    <div className="w-full h-full rounded-full border-2 border-white shadow-lg bg-white/20" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-white shadow" />
                    </div>
                  </div>
                  {/* Crosshair lines */}
                  <div className="absolute inset-0 pointer-events-none"
                    style={{
                      backgroundImage: `linear-gradient(to right, transparent calc(${focalX * 100}% - 0.5px), rgba(255,255,255,0.4) calc(${focalX * 100}% - 0.5px), rgba(255,255,255,0.4) calc(${focalX * 100}% + 0.5px), transparent calc(${focalX * 100}% + 0.5px)), linear-gradient(to bottom, transparent calc(${focalY * 100}% - 0.5px), rgba(255,255,255,0.4) calc(${focalY * 100}% - 0.5px), rgba(255,255,255,0.4) calc(${focalY * 100}% + 0.5px), transparent calc(${focalY * 100}% + 0.5px))`,
                    }}
                  />
                  <div className="absolute bottom-1.5 right-2 text-[10px] text-white/70 pointer-events-none">Click to set focus</div>
                </div>
                <button
                  onClick={() => { setImageUrl(""); setFocalX(0.5); setFocalY(0.5) }}
                  className="text-xs text-muted-foreground hover:text-destructive transition-colors"
                >
                  Remove image
                </button>
              </div>
            ) : null}
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => {
              const f = e.target.files?.[0]; if (f) uploadImage(f)
            }} />
            <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
              <Upload className="h-4 w-4 mr-1.5" />
              {uploading ? "Uploading…" : imageUrl ? "Replace Image" : "Upload Image"}
            </Button>
          </div>

          {/* Name */}
          <div className="space-y-1.5">
            <Label>Name *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea value={groupType} onChange={(e) => setGroupType(e.target.value)} placeholder="What is this group about?" rows={3} />
          </div>

          {/* Group Type */}
          <div className="space-y-1.5">
            <Label>Group Type</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Registration */}
          <div className="space-y-1.5">
            <Label>Registration</Label>
            <Select value={registration} onValueChange={(v) => setRegistration(v as typeof registration)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="OPEN">Open — anyone can join</SelectItem>
                <SelectItem value="REQUEST_TO_JOIN">Request to Join — members must request</SelectItem>
                <SelectItem value="CLOSED">Closed — leader-assigned only</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {registration === "CLOSED"
                ? "Group is only visible to existing members."
                : registration === "REQUEST_TO_JOIN"
                ? "Group is visible to all members; they can request to join."
                : "Group is open for anyone to join."}
            </p>
          </div>

          {/* Show on front page */}
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium">Show on Front Page</p>
              <p className="text-xs text-muted-foreground">Display this group publicly</p>
            </div>
            <Switch checked={showOnFrontPage} onCheckedChange={setShowOnFrontPage} />
          </div>

          {/* Schedule */}
          <div className="space-y-3">
            <Label>Schedule</Label>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <p className="text-xs text-muted-foreground">Start Date</p>
                <Input type="date" value={openDate} onChange={(e) => setOpenDate(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <p className="text-xs text-muted-foreground">End Date</p>
                <Input type="date" value={closeDate} onChange={(e) => setCloseDate(e.target.value)} />
              </div>
            </div>
          </div>

          {/* Linked chat channel */}
          <div className="space-y-1.5">
            <Label>Linked Chat Channel</Label>
            <Select value={linkedChannelId} onValueChange={(v) => linkChannel(v)}>
              <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {allChannels.map((c) => <SelectItem key={c.id} value={c.id}>#{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={createChat}
              disabled={creatingChat}
              className="w-full"
            >
              <MessageSquare className="h-4 w-4 mr-1.5" />
              {creatingChat ? "Creating…" : "Create New Chat for this Group"}
            </Button>
            <p className="text-xs text-muted-foreground">A &ldquo;Go to Chat&rdquo; button will appear on the dashboard.</p>
          </div>

          {/* Archive / Danger zone */}
          <div className="rounded-lg border border-amber-300/60 p-4 space-y-2">
            <p className="text-sm font-medium text-amber-700 dark:text-amber-400">Archive</p>
            <p className="text-xs text-muted-foreground">
              {group.archivedAt ? "This group is archived. Restore it to make it active again." : "Archiving hides this group from the active list."}
            </p>
            <Button variant="outline" size="sm" onClick={() => { onClose(); onArchive() }}>
              <Archive className="h-3.5 w-3.5 mr-1.5" />
              {group.archivedAt ? "Restore Group" : "Archive Group"}
            </Button>
          </div>
          <div className="rounded-lg border border-destructive/40 p-4 space-y-2">
            <p className="text-sm font-medium text-destructive">Danger Zone</p>
            <p className="text-xs text-muted-foreground">Deleting this group cannot be undone.</p>
            <Button variant="destructive" size="sm" onClick={() => { onClose(); onDelete() }}>
              Delete Group
            </Button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t shrink-0">
          <Button onClick={save} disabled={saving || !name.trim()} className="w-full">
            {saving ? "Saving…" : "Save Changes"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

// ── Members Panel ──────────────────────────────────────────────────────────

function MembersPanel({
  groupId, members: initMembers, allUsers,
}: {
  groupId: string
  members: GroupMember[]
  allUsers: User[]
}) {
  const [members, setMembers] = useState(initMembers)
  const [showAdd, setShowAdd] = useState(false)
  const [search, setSearch] = useState("")
  const [adding, setAdding] = useState<string | null>(null)

  const memberIds = new Set(members.map((m) => m.userId))
  const available = allUsers.filter((u) => !memberIds.has(u.id))
  const filtered = search.trim()
    ? available.filter((u) =>
        u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase())
      )
    : available

  async function addMember(userId: string) {
    setAdding(userId)
    const res = await fetch(`/api/groups/${groupId}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, role: "MEMBER" }),
    })
    setAdding(null)
    if (res.ok) {
      const m = await res.json()
      setMembers((prev) => [...prev, m])
      toast.success("Member added")
    }
  }

  async function toggleRole(m: GroupMember) {
    const newRole = m.role === "LEADER" ? "MEMBER" : "LEADER"
    const res = await fetch(`/api/groups/${groupId}/members/${m.userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: newRole }),
    })
    if (res.ok) {
      const updated = await res.json()
      setMembers((prev) => prev.map((x) => x.userId === m.userId ? updated : x))
    }
  }

  async function removeMember(userId: string) {
    const res = await fetch(`/api/groups/${groupId}/members/${userId}`, { method: "DELETE" })
    if (res.ok) {
      setMembers((prev) => prev.filter((m) => m.userId !== userId))
      toast.success("Member removed")
    }
  }

  const sorted = [...members].sort((a, b) => {
    if (a.role === "LEADER" && b.role !== "LEADER") return -1
    if (b.role === "LEADER" && a.role !== "LEADER") return 1
    return a.user.name.localeCompare(b.user.name)
  })

  return (
    <div className="space-y-4">
      {/* Add member */}
      <div className="flex justify-end">
        <Button size="sm" variant="outline" onClick={() => { setShowAdd((v) => !v); setSearch("") }}>
          <UserPlus className="h-4 w-4 mr-1.5" /> Add Member
        </Button>
      </div>

      {showAdd && available.length > 0 && (
        <div className="space-y-1">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email…"
            autoFocus
          />
          <div className="border rounded-md overflow-hidden max-h-48 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-3">No matches</p>
            ) : (
              filtered.map((u) => (
                <button
                  key={u.id}
                  onClick={() => { addMember(u.id); setSearch(""); setShowAdd(false) }}
                  disabled={adding === u.id}
                  className="w-full flex items-center gap-3 px-3 py-2 hover:bg-accent transition-colors text-left"
                >
                  <div className="h-7 w-7 rounded-full bg-secondary flex items-center justify-center font-semibold text-[10px] shrink-0 overflow-hidden">
                    {u.avatar
                      ? <img src={u.avatar} alt={u.name} className="w-full h-full object-cover" />
                      : initials(u.name)
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{u.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                  </div>
                  {adding === u.id && <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
      {showAdd && available.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-2">All users are already members.</p>
      )}

      {/* Member list */}
      <div className="space-y-1">
        {sorted.map((m) => (
          <div key={m.userId} className="flex items-center gap-3 p-2.5 rounded-lg border bg-card">
            <Avatar user={m.user} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{m.user.name}</p>
              <p className="text-xs text-muted-foreground truncate">{m.user.email}</p>
            </div>
            {m.role === "LEADER" && (
              <span className="flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400">
                <Crown className="h-3.5 w-3.5" /> Leader
              </span>
            )}
            <button
              onClick={() => toggleRole(m)}
              title={m.role === "LEADER" ? "Remove leader role" : "Make leader"}
              className="p-1.5 text-muted-foreground hover:text-amber-500 transition-colors"
            >
              <Crown className="h-4 w-4" />
            </button>
            <button
              onClick={() => removeMember(m.userId)}
              title="Remove from group"
              className="p-1.5 text-muted-foreground hover:text-destructive transition-colors"
            >
              <UserMinus className="h-4 w-4" />
            </button>
          </div>
        ))}
        {members.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-6">No members yet.</p>
        )}
      </div>
    </div>
  )
}

// ── Events Panel ───────────────────────────────────────────────────────────

function EventsPanel({
  groupId, events: initEvents, members,
}: {
  groupId: string
  events: GroupEvent[]
  members: GroupMember[]
}) {
  const [events, setEvents] = useState(initEvents)
  const [showForm, setShowForm] = useState(false)
  const [editingEvent, setEditingEvent] = useState<GroupEvent | null>(null)
  const [attendanceEvent, setAttendanceEvent] = useState<GroupEvent | null>(null)

  async function deleteEvent(id: string) {
    const res = await fetch(`/api/groups/${groupId}/events/${id}`, { method: "DELETE" })
    if (res.ok) {
      setEvents((prev) => prev.filter((e) => e.id !== id))
      toast.success("Event deleted")
    }
  }

  function onSaveEvent(ev: GroupEvent) {
    setEvents((prev) => {
      const idx = prev.findIndex((e) => e.id === ev.id)
      if (idx >= 0) { const next = [...prev]; next[idx] = ev; return next }
      return [...prev, ev].sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
    })
    setEditingEvent(null)
  }

  const now = new Date()
  const upcoming = events.filter((e) => new Date(e.startDate) >= now)
  const past = events.filter((e) => new Date(e.startDate) < now)

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => { setEditingEvent(null); setShowForm(true) }}>
          <Plus className="h-4 w-4 mr-1" /> Add Event
        </Button>
      </div>

      {events.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">No events scheduled yet.</p>
      )}

      {upcoming.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Upcoming</h3>
          {upcoming.map((ev) => <EventRow key={ev.id} ev={ev} groupId={groupId} onEdit={(e) => { setEditingEvent(e); setShowForm(true) }} onDelete={deleteEvent} onAttendance={setAttendanceEvent} />)}
        </div>
      )}

      {past.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Past</h3>
          {past.map((ev) => <EventRow key={ev.id} ev={ev} groupId={groupId} onEdit={(e) => { setEditingEvent(e); setShowForm(true) }} onDelete={deleteEvent} onAttendance={setAttendanceEvent} />)}
        </div>
      )}

      {(showForm || editingEvent) && (
        <EventFormDialog
          groupId={groupId}
          event={editingEvent}
          onSave={onSaveEvent}
          onClose={() => { setShowForm(false); setEditingEvent(null) }}
        />
      )}

      {attendanceEvent && (
        <AttendanceDialog
          groupId={groupId}
          event={attendanceEvent}
          members={members}
          onClose={() => setAttendanceEvent(null)}
          onUpdate={(ev) => {
            setEvents((prev) => prev.map((e) => e.id === ev.id ? ev : e))
            setAttendanceEvent(ev)
          }}
        />
      )}
    </div>
  )
}

function EventRow({
  ev, groupId, onEdit, onDelete, onAttendance,
}: {
  ev: GroupEvent
  groupId: string
  onEdit: (ev: GroupEvent) => void
  onDelete: (id: string) => void
  onAttendance: (ev: GroupEvent) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const recLabel = recurrenceLabel(ev.recurrence)
  const present = ev.attendance.filter((a) => a.present).length

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <div className="p-3 flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-medium">{ev.title}</p>
            {recLabel && (
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded-full">
                <Repeat2 className="h-3 w-3" /> {recLabel}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{fmtDate(ev.startDate)}</p>
          {ev.recurrenceEndDate && (
            <p className="text-xs text-muted-foreground">Until {new Date(ev.recurrenceEndDate).toLocaleDateString()}</p>
          )}
          {ev.attendance.length > 0 && (
            <p className="text-xs text-muted-foreground mt-0.5">{present} present</p>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => onAttendance(ev)}
            className="p-1.5 text-muted-foreground hover:text-foreground transition-colors"
            title="Take attendance"
          >
            <Check className="h-4 w-4" />
          </button>
          <button
            onClick={() => onEdit(ev)}
            className="p-1.5 text-muted-foreground hover:text-foreground transition-colors"
            title="Edit event"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <div className="relative group/export">
            <button
              className="p-1.5 text-muted-foreground hover:text-foreground transition-colors"
              title="Export event"
            >
              <Download className="h-4 w-4" />
            </button>
            <div className="absolute right-0 top-full mt-1 hidden group-hover/export:flex flex-col bg-popover border rounded-md shadow-md z-10 min-w-[140px] py-1">
              <button
                onClick={() => exportIcal(ev)}
                className="flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-accent transition-colors text-left"
              >
                <Download className="h-3 w-3" /> Download iCal
              </button>
              <button
                onClick={() => exportGcal(ev)}
                className="flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-accent transition-colors text-left"
              >
                <Globe className="h-3 w-3" /> Google Calendar
              </button>
            </div>
          </div>
          <button
            onClick={() => onDelete(ev.id)}
            className="p-1.5 text-muted-foreground hover:text-destructive transition-colors"
            title="Delete event"
          >
            <Trash2 className="h-4 w-4" />
          </button>
          {ev.description && (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="p-1.5 text-muted-foreground"
            >
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          )}
        </div>
      </div>
      {expanded && ev.description && (
        <div className="px-3 pb-3 text-sm text-muted-foreground border-t pt-2">
          {ev.description}
        </div>
      )}
    </div>
  )
}

// ── Main Dashboard ─────────────────────────────────────────────────────────

export default function GroupDashboard({ group: initGroup, categories, allUsers, allChannels, currentUserId, sessionRole, broadcasts }: Props) {
  const searchParams = useSearchParams()
  const [group, setGroup] = useState(initGroup)
  const [showSettings, setShowSettings] = useState(searchParams.get("tab") === "settings")
  const [activeTab, setActiveTab] = useState("overview")
  const router = useRouter()

  async function deleteGroup() {
    if (!confirm(`Delete "${group.name}"? This cannot be undone.`)) return
    const res = await fetch(`/api/groups/${group.id}`, { method: "DELETE" })
    if (res.ok) { router.push("/mychurch/groups") }
    else { toast.error("Failed to delete group") }
  }

  async function archiveGroup() {
    const isArchived = !!group.archivedAt
    const res = await fetch(`/api/groups/${group.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archivedAt: isArchived ? null : new Date().toISOString() }),
    })
    if (res.ok) {
      setGroup((prev) => ({ ...prev, archivedAt: isArchived ? null : new Date().toISOString() }))
      toast.success(isArchived ? "Group restored" : "Group archived")
      if (!isArchived) router.push("/mychurch/groups")
    } else { toast.error("Failed to update group") }
  }

  const channel = group.channels[0] ?? null
  const now = new Date()

  // Open/closed status based on date range
  let statusLabel = "Open"
  let statusColor = "text-green-600 dark:text-green-400"
  if (group.openTime || group.closeTime) {
    const openDate = group.openTime ? new Date(group.openTime) : null
    const closeDate = group.closeTime ? new Date(group.closeTime) : null
    if ((openDate && now < openDate) || (closeDate && now > closeDate)) {
      statusLabel = "Closed"
      statusColor = "text-muted-foreground"
    }
  }

  const focalX = group.imageFocalX ?? 0.5
  const focalY = group.imageFocalY ?? 0.5

  return (
    <div className="space-y-6">
      {/* Header — hero if image, plain text if not */}
      {group.imageUrl ? (
        <div className="-mx-6 -mt-6">
          <div className="relative h-52 sm:h-64 overflow-hidden">
            <img
              src={group.imageUrl}
              alt={group.name}
              className="w-full h-full object-cover"
              style={{ objectPosition: `${focalX * 100}% ${focalY * 100}%` }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
            <div className="absolute top-3 right-3 flex gap-2">
              {channel && (
                <Link href={`/mychurch/chat/${channel.id}`}>
                  <Button size="sm" variant="secondary" className="shadow-md">
                    <MessageSquare className="h-4 w-4 mr-1.5" /> Go to Chat
                  </Button>
                </Link>
              )}
              <Button size="sm" variant="secondary" className="shadow-md" onClick={() => setShowSettings(true)}>
                <Settings className="h-4 w-4 mr-1.5" /> Settings
              </Button>
            </div>
            <div className="absolute bottom-0 left-0 right-0 px-6 pb-4 text-white">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                {group.category && (
                  <span className="text-[11px] font-medium bg-white/20 backdrop-blur-sm px-2 py-0.5 rounded-full">
                    {group.category.name}
                  </span>
                )}
                <span className={`text-[11px] font-medium ${statusLabel === "Open" ? "text-green-300" : "text-white/60"}`}>
                  ● {statusLabel}
                </span>
                {group.registration === "CLOSED" && (
                  <span className="flex items-center gap-1 text-[11px] text-white/60">
                    <Lock className="h-3 w-3" /> Closed
                  </span>
                )}
                {group.registration === "REQUEST_TO_JOIN" && (
                  <span className="flex items-center gap-1 text-[11px] text-white/60">
                    <UserCheck className="h-3 w-3" /> Request to Join
                  </span>
                )}
                {group.showOnFrontPage && (
                  <span className="flex items-center gap-1 text-[11px] text-white/60">
                    <Globe className="h-3 w-3" /> Public
                  </span>
                )}
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold leading-tight drop-shadow">{group.name}</h1>
              {group.groupType && (
                <p className="text-sm text-white/80 mt-0.5 line-clamp-2">{group.groupType}</p>
              )}
              {(group.openTime || group.closeTime) && (
                <p className="flex items-center gap-1 text-xs text-white/60 mt-1">
                  <Clock className="h-3 w-3" />
                  {group.openTime && group.closeTime
                    ? `${new Date(group.openTime).toLocaleDateString()} – ${new Date(group.closeTime).toLocaleDateString()}`
                    : group.openTime
                    ? `From ${new Date(group.openTime).toLocaleDateString()}`
                    : `Until ${new Date(group.closeTime!).toLocaleDateString()}`
                  }
                </p>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              {group.category && (
                <span className="text-xs font-medium bg-secondary px-2 py-0.5 rounded-full">{group.category.name}</span>
              )}
              <span className={`text-xs font-medium ${statusLabel === "Open" ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}`}>
                ● {statusLabel}
              </span>
              {group.registration === "CLOSED" && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground"><Lock className="h-3 w-3" /> Closed</span>
              )}
              {group.registration === "REQUEST_TO_JOIN" && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground"><UserCheck className="h-3 w-3" /> Request to Join</span>
              )}
            </div>
            <h1 className="text-2xl font-bold">{group.name}</h1>
            {group.groupType && <p className="text-sm text-muted-foreground mt-0.5">{group.groupType}</p>}
          </div>
          <div className="flex gap-2 shrink-0 pt-1">
            {channel && (
              <Link href={`/mychurch/chat/${channel.id}`}>
                <Button size="sm" variant="outline">
                  <MessageSquare className="h-4 w-4 mr-1.5" /> Go to Chat
                </Button>
              </Link>
            )}
            <Button size="sm" variant="outline" onClick={() => setShowSettings(true)}>
              <Settings className="h-4 w-4 mr-1.5" /> Settings
            </Button>
          </div>
        </div>
      )}

      {/* Pinned content */}
      {channel && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <ChannelLinksCard
            channelId={channel.id}
            canManage={
              sessionRole === "ADMIN" || sessionRole === "LEADER" ||
              group.members.some((m) => m.user.id === currentUserId && m.role === "LEADER")
            }
          />
          <ChannelPinsCard channelId={channel.id} channelName={channel.name} />
        </div>
      )}

      {/* Tabs */}
      {(() => {
        const isGroupLeader = group.members.some((m) => m.user.id === currentUserId && m.role === "LEADER")
        const canSeeLeaders = sessionRole === "ADMIN" || sessionRole === "LEADER" || isGroupLeader
        return (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="overview">
                <CalendarDays className="h-4 w-4 mr-1.5" /> Events
              </TabsTrigger>
              <TabsTrigger value="members">
                <Users className="h-4 w-4 mr-1.5" /> Members
              </TabsTrigger>
              {canSeeLeaders && (
                <TabsTrigger value="leaders">
                  <Megaphone className="h-4 w-4 mr-1.5" /> Leaders
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="overview" className="mt-4 space-y-4">
              <EventsPanel
                groupId={group.id}
                events={group.events}
                members={group.members}
              />
            </TabsContent>

            <TabsContent value="members" className="mt-4">
              <MembersPanel groupId={group.id} members={group.members} allUsers={allUsers} />
            </TabsContent>

            {canSeeLeaders && (
              <TabsContent value="leaders" className="mt-4 space-y-4">
                {broadcasts.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No broadcasts for this group yet.</p>
                ) : (
                  broadcasts.map((b) => (
                    <div key={b.id} className="rounded-lg border bg-card p-4 space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold text-sm">{b.title}</h3>
                        <span className="text-xs text-muted-foreground shrink-0">
                          {new Date(b.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{b.content}</p>
                      <p className="text-xs text-muted-foreground">— {b.author.name}</p>
                    </div>
                  ))
                )}
              </TabsContent>
            )}
          </Tabs>
        )
      })()}

      {/* Settings sheet */}
      {showSettings && (
        <SettingsSheet
          group={group}
          categories={categories}
          allChannels={allChannels}
          onClose={() => { setShowSettings(false); router.replace(`/mychurch/groups/${group.id}`) }}
          onUpdate={(updated) => setGroup((prev) => ({ ...prev, ...updated }))}
          onDelete={deleteGroup}
          onArchive={archiveGroup}
        />
      )}
    </div>
  )
}
