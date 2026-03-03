"use client"

import { useState, useRef } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChevronLeft, Pencil, Check, X, Trash2, Plus, CalendarDays, Users, Camera } from "lucide-react"
import { ROLE_BADGE, ROLE_LABELS } from "@/lib/category-colors"

interface Team { id: string; name: string }
interface ServiceSlot {
  role: { name: string }
  serviceTeam: { team: { name: string }; service: { id: string; title: string; date: string | Date } }
}
interface ProfileNote { id: string; content: string; createdAt: string | Date; author: { id: string; name: string } }
interface User {
  id: string; name: string; email: string; role: string; phone: string | null
  avatar: string | null; birthday: string | Date | null; address: string | null
  gender: string | null; socialProfiles: Record<string, string> | null; createdAt: string | Date
  teamMemberships: { team: { id: string; name: string } }[]
  serviceSlots: ServiceSlot[]
  profileNotes?: ProfileNote[] | null
}

interface Props {
  user: User
  allTeams: Team[]
  sessionRole: string
  sessionId: string
  timezone: string
}

const GENDER_OPTIONS = ["Male", "Female", "Non-binary", "Prefer not to say"]
const SOCIAL_KEYS = ["instagram", "facebook", "youtube", "tiktok", "twitter", "website"] as const
const ROLES = ["VISITOR", "MEMBER", "LEADER", "ADMIN"] as const

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

export default function UserProfile({ user: initUser, allTeams, sessionRole, sessionId, timezone }: Props) {
  const [user, setUser] = useState(initUser)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)

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
    address: user.address ?? "",
    gender: user.gender ?? "",
    role: user.role,
    social: { instagram: "", facebook: "", youtube: "", tiktok: "", twitter: "", website: "", ...(user.socialProfiles ?? {}) },
    teamIds: user.teamMemberships.map((m) => m.team.id),
    avatar: user.avatar as string | null,
  })

  const avatarRef = useRef<HTMLInputElement>(null)

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
      address: user.address ?? "", gender: user.gender ?? "", role: user.role,
      social: { instagram: "", facebook: "", youtube: "", tiktok: "", twitter: "", website: "", ...(user.socialProfiles ?? {}) },
      teamIds: user.teamMemberships.map((m) => m.team.id),
      avatar: user.avatar as string | null,
    })
    setEditing(false)
  }

  async function handleSave() {
    setSaving(true)
    const res = await fetch(`/api/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        email: isAdmin ? form.email : undefined,
        phone: form.phone || null,
        birthday: form.birthday || null,
        address: form.address || null,
        gender: form.gender || null,
        socialProfiles: Object.fromEntries(Object.entries(form.social).filter(([, v]) => v)),
        role: isAdmin ? form.role : undefined,
        teamIds: isAdmin ? form.teamIds : undefined,
        avatar: form.avatar,
      }),
    })
    setSaving(false)
    if (res.ok) {
      const updated = await res.json()
      setUser((prev) => ({
        ...prev, ...updated,
        teamMemberships: isAdmin
          ? allTeams.filter((t) => form.teamIds.includes(t.id)).map((t) => ({ team: t }))
          : prev.teamMemberships,
      }))
      setEditing(false)
      toast.success("Profile saved")
    } else {
      toast.error("Failed to save profile")
    }
  }

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

  const age = computeAge(user.birthday)

  return (
    <div className="space-y-4 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/admin/users" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
          <ChevronLeft className="h-4 w-4" /> Users
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
        </div>
        <span className={`text-xs px-2 py-1 rounded font-medium ${ROLE_BADGE[user.role] ?? ROLE_BADGE.MEMBER}`}>
          {ROLE_LABELS[user.role] ?? user.role}
        </span>
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
          {isAdmin && <TabsTrigger value="notes">Notes {notes.length > 0 && `(${notes.length})`}</TabsTrigger>}
        </TabsList>

        {/* ── INFO TAB ── */}
        <TabsContent value="info" className="space-y-4 mt-4">
          {editing ? (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Edit Profile</CardTitle>
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
                </div>

                <Field label="Address">
                  <Textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} rows={2} placeholder="Street, City, State, ZIP" />
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
                )}

                <div className="flex gap-2 pt-2">
                  <Button size="sm" onClick={handleSave} disabled={saving}>
                    <Check className="h-3.5 w-3.5 mr-1" /> {saving ? "Saving…" : "Save"}
                  </Button>
                  <Button size="sm" variant="outline" onClick={resetForm}>
                    <X className="h-3.5 w-3.5 mr-1" /> Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                <InfoRow label="Phone" value={user.phone} />
                <InfoRow label={`Birthday${age != null ? ` · Age ${age}` : ""}`} value={user.birthday ? new Date(user.birthday).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" }) : null} />
                <InfoRow label="Gender" value={user.gender} />
                {isAdmin && <InfoRow label="Role" value={`${user.role} — ${ROLE_LABELS[user.role] ?? ""}`} />}
              </div>
              {user.address && (
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Address</p>
                  <p className="text-sm whitespace-pre-line">{user.address}</p>
                </div>
              )}
              {user.socialProfiles && Object.keys(user.socialProfiles).length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Social Profiles</p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(user.socialProfiles).filter(([, v]) => v).map(([key, value]) => (
                      <span key={key} className="text-xs bg-gray-100 px-2 py-1 rounded">
                        <span className="text-muted-foreground capitalize">{key}: </span>{value}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <p className="text-xs text-muted-foreground mb-1">Teams</p>
                {user.teamMemberships.length === 0
                  ? <p className="text-sm text-muted-foreground">Not on any teams</p>
                  : <div className="flex flex-wrap gap-1.5">
                      {user.teamMemberships.map((m) => (
                        <Badge key={m.team.id} variant="secondary">{m.team.name}</Badge>
                      ))}
                    </div>
                }
              </div>
            </div>
          )}
        </TabsContent>

        {/* ── ACTIVITY TAB ── */}
        <TabsContent value="activity" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm flex items-center gap-1.5">
                <CalendarDays className="h-4 w-4" /> Profile Created
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3 text-sm text-muted-foreground">
              {new Date(user.createdAt).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric", timeZone: timezone })}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm flex items-center gap-1.5">
                <Users className="h-4 w-4" /> Teams
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3">
              {user.teamMemberships.length === 0
                ? <p className="text-sm text-muted-foreground">Not serving on any teams</p>
                : <ul className="space-y-1">
                    {user.teamMemberships.map((m) => (
                      <li key={m.team.id} className="text-sm">{m.team.name}</li>
                    ))}
                  </ul>
              }
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm">Service History</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3">
              {user.serviceSlots.length === 0
                ? <p className="text-sm text-muted-foreground">No services assigned yet</p>
                : <ul className="divide-y">
                    {user.serviceSlots.map((slot, i) => (
                      <li key={i} className="py-2">
                        <p className="text-sm font-medium">{slot.serviceTeam.service.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(slot.serviceTeam.service.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })}
                          {" · "}{slot.serviceTeam.team.name} · {slot.role.name}
                        </p>
                      </li>
                    ))}
                  </ul>
              }
            </CardContent>
          </Card>
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
      </Tabs>
    </div>
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
