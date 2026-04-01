"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { toast } from "sonner"
import {
  ArrowLeft, Save, Trash2, Plus, ExternalLink, Download, Link2,
  FileSpreadsheet, ClipboardList, Users, Send, Megaphone,
} from "lucide-react"
import FormBuilder, { FormFieldDef } from "@/components/admin/FormBuilder"
import LocationSearch from "@/components/admin/LocationSearch"

interface FormField {
  id: string; type: string; label: string; description: string | null
  required: boolean; order: number; config: unknown
}
interface FormData {
  id: string; title: string; description: string | null
  googleSheetUrl: string | null
  fields: FormField[]
  _count: { responses: number }
}
interface EventData {
  id: string; title: string; description: string | null
  startDate: Date; endDate: Date | null; location: string | null; imageUrl: string | null
  published: boolean; rsvpEnabled: boolean
  form: FormData | null
  sourceService: { id: string; title: string | null; date: Date; category: { name: string } | null } | null
}
interface Template { id: string; name: string }
interface Response {
  id: string; respondent: string | null; createdAt: string
  fieldValues: { fieldId: string; value: string | null; field: { label: string } }[]
}
interface Rsvp {
  id: string; name: string; email: string | null; createdAt: string
  user: { id: string; name: string; email: string; avatar: string | null } | null
}
interface Announcement { id: string; subject: string; message: string; sentAt: string }

function toLocalDate(d: Date) {
  const dt = new Date(d)
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`
}

function toLocalTime(d: Date) {
  const dt = new Date(d)
  return `${String(dt.getHours()).padStart(2, "0")}:${String(dt.getMinutes()).padStart(2, "0")}`
}

function buildDatetime(date: string, time: string) {
  if (!date) return ""
  return time ? `${date}T${time}` : `${date}T00:00`
}

function dateParts(dt: Date) {
  return {
    date: `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`,
    time: `${String(dt.getHours()).padStart(2, "0")}:${String(dt.getMinutes()).padStart(2, "0")}`,
  }
}

function dbFieldsToBuilderFields(fields: FormField[]): FormFieldDef[] {
  return fields.map((f) => ({
    id: f.id,
    type: f.type as FormFieldDef["type"],
    label: f.label,
    description: f.description ?? "",
    required: f.required,
    config: (f.config as Record<string, unknown>) ?? {},
  }))
}

export default function EventDetail({
  event: init, templates, userRole,
}: {
  event: EventData; templates: Template[]; userRole: string
}) {
  const router = useRouter()
  const canSeeResponses = userRole === "ADMIN" || userRole === "LEADER"

  // Event fields
  const [title, setTitle] = useState(init.title)
  const [description, setDescription] = useState(init.description ?? "")
  const [startDate, setStartDate] = useState(toLocalDate(init.startDate))
  const [startTime, setStartTime] = useState(toLocalTime(init.startDate))
  const [endDate, setEndDate] = useState(init.endDate ? toLocalDate(init.endDate) : "")
  const [endTime, setEndTime] = useState(init.endDate ? toLocalTime(init.endDate) : "")
  const [location, setLocation] = useState(init.location ?? "")
  const [imageUrl, setImageUrl] = useState(init.imageUrl ?? "")
  const [published, setPublished] = useState(init.published)
  const [rsvpEnabled, setRsvpEnabled] = useState(init.rsvpEnabled)
  const [saving, setSaving] = useState(false)

  const startDateRef = useRef<HTMLInputElement>(null)
  const startTimeRef = useRef<HTMLInputElement>(null)
  const endDateRef = useRef<HTMLInputElement>(null)
  const endTimeRef = useRef<HTMLInputElement>(null)
  const durationRef = useRef<number | null>(
    init.endDate ? new Date(init.endDate).getTime() - new Date(init.startDate).getTime() : null
  )

  function showPicker(ref: React.RefObject<HTMLInputElement | null>) {
    try { ref.current?.showPicker() } catch { /* unsupported */ }
  }

  // Form
  const [form, setForm] = useState<FormData | null>(init.form)
  const [formFields, setFormFields] = useState<FormFieldDef[]>(
    init.form ? dbFieldsToBuilderFields(init.form.fields) : []
  )
  const [formTitle, setFormTitle] = useState(init.form?.title ?? "")
  const [formDescription, setFormDescription] = useState(init.form?.description ?? "")
  const [sheetUrl, setSheetUrl] = useState(init.form?.googleSheetUrl ?? "")
  const [selectedTemplateId, setSelectedTemplateId] = useState("")
  const [creatingForm, setCreatingForm] = useState(false)
  const [savingForm, setSavingForm] = useState(false)

  // Responses
  const [responses, setResponses] = useState<Response[]>([])
  const [loadingResponses, setLoadingResponses] = useState(false)

  const loadResponses = useCallback(async () => {
    if (!form || !canSeeResponses) return
    setLoadingResponses(true)
    const res = await fetch(`/api/forms/${form.id}/responses`)
    if (res.ok) setResponses(await res.json())
    setLoadingResponses(false)
  }, [form, canSeeResponses])

  useEffect(() => { loadResponses() }, [loadResponses])

  // RSVPs
  const [rsvps, setRsvps] = useState<Rsvp[]>([])
  const [loadingRsvps, setLoadingRsvps] = useState(false)

  const loadRsvps = useCallback(async () => {
    if (!canSeeResponses || !rsvpEnabled) return
    setLoadingRsvps(true)
    const res = await fetch(`/api/events/${init.id}/rsvp`)
    if (res.ok) setRsvps(await res.json())
    setLoadingRsvps(false)
  }, [canSeeResponses, rsvpEnabled, init.id])

  useEffect(() => { loadRsvps() }, [loadRsvps])

  // Announcements
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [showAnnounceDialog, setShowAnnounceDialog] = useState(false)
  const [annSubject, setAnnSubject] = useState("")
  const [annMessage, setAnnMessage] = useState("")
  const [sendingAnn, setSendingAnn] = useState(false)

  async function loadAnnouncements() {
    const res = await fetch(`/api/events/${init.id}/announcements`)
    if (res.ok) setAnnouncements(await res.json())
  }

  useEffect(() => { if (canSeeResponses) loadAnnouncements() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function sendAnnouncement() {
    if (!annSubject || !annMessage) { toast.error("Subject and message required"); return }
    setSendingAnn(true)
    const res = await fetch(`/api/events/${init.id}/announcements`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject: annSubject, message: annMessage }),
    })
    setSendingAnn(false)
    if (res.ok) {
      toast.success("Announcement recorded")
      setShowAnnounceDialog(false)
      setAnnSubject("")
      setAnnMessage("")
      loadAnnouncements()
    } else {
      toast.error("Failed to send announcement")
    }
  }

  async function saveEvent() {
    setSaving(true)
    const res = await fetch(`/api/events/${init.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title, description,
        startDate: buildDatetime(startDate, startTime),
        endDate: endDate ? buildDatetime(endDate, endTime) : null,
        location, imageUrl, published, rsvpEnabled,
      }),
    })
    setSaving(false)
    if (res.ok) toast.success("Event saved")
    else toast.error("Failed to save event")
  }

  async function deleteEvent() {
    if (!confirm("Delete this event?")) return
    await fetch(`/api/events/${init.id}`, { method: "DELETE" })
    toast.success("Event deleted")
    router.push("/mychurch/events")
  }

  async function createForm() {
    setCreatingForm(true)
    const res = await fetch("/api/forms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: formTitle || `${title} Sign-Up`,
        description: formDescription || null,
        eventId: init.id,
        templateId: selectedTemplateId || null,
      }),
    })
    setCreatingForm(false)
    if (res.ok) {
      const created = await res.json()
      setForm(created)
      setFormTitle(created.title)
      setFormDescription(created.description ?? "")
      setFormFields(dbFieldsToBuilderFields(created.fields))
      toast.success("Sign-up form created")
    } else {
      toast.error("Failed to create form")
    }
  }

  async function saveForm() {
    if (!form) return
    setSavingForm(true)

    await fetch(`/api/forms/${form.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: formTitle,
        description: formDescription || null,
        googleSheetUrl: sheetUrl || null,
      }),
    })

    await fetch(`/api/forms/${form.id}/fields`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fields: formFields }),
    })

    setSavingForm(false)
    toast.success("Form saved")
  }

  async function deleteForm() {
    if (!form) return
    if (!confirm("Delete the sign-up form and all responses?")) return
    await fetch(`/api/forms/${form.id}`, { method: "DELETE" })
    setForm(null)
    setFormFields([])
    toast.success("Form deleted")
  }

  function exportCsv() {
    if (!form || responses.length === 0) return
    const allFields = form.fields
    const headers = ["Submitted At", "Respondent", ...allFields.map((f) => f.label)]
    const rows = responses.map((r) => {
      const map: Record<string, string> = {}
      r.fieldValues.forEach((fv) => { map[fv.fieldId] = fv.value ?? "" })
      return [
        new Date(r.createdAt).toLocaleString(),
        r.respondent ?? "Anonymous",
        ...allFields.map((f) => map[f.id] ?? ""),
      ]
    })
    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${title}-responses.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  function exportRsvpCsv() {
    if (rsvps.length === 0) return
    const headers = ["Name", "Email", "RSVP'd At"]
    const rows = rsvps.map((r) => [
      r.name,
      r.email ?? "",
      new Date(r.createdAt).toLocaleString(),
    ])
    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${title}-attendees.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const hasAttendees = rsvpEnabled || !!form
  const announceButton = (
    <Button
      variant="outline"
      size="sm"
      onClick={() => setShowAnnounceDialog(true)}
      disabled={rsvps.length === 0 && responses.length === 0}
    >
      <Megaphone className="h-4 w-4 mr-1" /> Send Announcement
    </Button>
  )

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/mychurch/events"><ArrowLeft className="h-4 w-4 mr-1" />Events</Link>
        </Button>
      </div>

      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold">{title || "Untitled Event"}</h1>
          {published
            ? <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Published</Badge>
            : <Badge variant="secondary">Draft</Badge>}
          {rsvpEnabled && (
            <Badge variant="outline" className="gap-1">
              <Users className="h-3 w-3" /> RSVP
            </Badge>
          )}
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="destructive" size="sm" onClick={deleteEvent}>
            <Trash2 className="h-4 w-4 mr-1" /> Delete
          </Button>
          <Button size="sm" onClick={saveEvent} disabled={saving}>
            <Save className="h-4 w-4 mr-1" />{saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="details">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          {rsvpEnabled && canSeeResponses && (
            <TabsTrigger value="attendees">
              Attendees
              {rsvps.length > 0 && <Badge variant="secondary" className="ml-1.5 text-xs">{rsvps.length}</Badge>}
            </TabsTrigger>
          )}
          <TabsTrigger value="form">
            Sign-Up Form
            {form && <Badge variant="secondary" className="ml-1.5 text-xs">{form._count.responses}</Badge>}
          </TabsTrigger>
          {canSeeResponses && form && (
            <TabsTrigger value="responses">
              Responses
              {responses.length > 0 && <Badge variant="secondary" className="ml-1.5 text-xs">{responses.length}</Badge>}
            </TabsTrigger>
          )}
        </TabsList>

        {/* ── Details tab ── */}
        <TabsContent value="details" className="space-y-3 pt-4">
          {init.sourceService && (
            <Link
              href={`/mychurch/services/${init.sourceService.id}`}
              className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-muted/50 transition-colors"
            >
              <Link2 className="h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0">
                <span className="font-medium">
                  {init.sourceService.title || init.sourceService.category?.name || "Service"}
                </span>
                <span className="text-muted-foreground ml-2">
                  {new Date(init.sourceService.date).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
                </span>
              </div>
              <ExternalLink className="h-3.5 w-3.5 ml-auto shrink-0 text-muted-foreground" />
            </Link>
          )}
          <div className="space-y-1">
            <Label>Title *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Description</Label>
            <Textarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Start Date *</Label>
              <Input ref={startDateRef} type="date" value={startDate}
                onClick={() => showPicker(startDateRef)}
                onChange={(e) => {
                  const newDate = e.target.value
                  setStartDate(newDate)
                  const d = durationRef.current
                  if (d !== null && newDate) {
                    const { date, time } = dateParts(new Date(new Date(`${newDate}T${startTime || "00:00"}`).getTime() + d))
                    setEndDate(date); setEndTime(time)
                  }
                }} />
            </div>
            <div className="space-y-1">
              <Label>Start Time</Label>
              <Input ref={startTimeRef} type="time" value={startTime}
                onClick={() => showPicker(startTimeRef)}
                onChange={(e) => {
                  const newTime = e.target.value
                  setStartTime(newTime)
                  const d = durationRef.current
                  if (d !== null && startDate) {
                    const { date, time } = dateParts(new Date(new Date(`${startDate}T${newTime || "00:00"}`).getTime() + d))
                    setEndDate(date); setEndTime(time)
                  }
                }} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>End Date</Label>
              <Input ref={endDateRef} type="date" value={endDate}
                min={startDate || undefined}
                onClick={() => showPicker(endDateRef)}
                onChange={(e) => {
                  const raw = e.target.value
                  const clamped = startDate && raw && raw < startDate ? startDate : raw
                  setEndDate(clamped)
                  const s = new Date(`${startDate || clamped}T${startTime || "00:00"}`)
                  const en = new Date(`${clamped}T${endTime || "00:00"}`)
                  durationRef.current = clamped ? Math.max(0, en.getTime() - s.getTime()) : null
                }} />
            </div>
            <div className="space-y-1">
              <Label>End Time</Label>
              <Input ref={endTimeRef} type="time" value={endTime}
                onClick={() => showPicker(endTimeRef)}
                onChange={(e) => {
                  const newTime = e.target.value
                  setEndTime(newTime)
                  if (startDate && endDate) {
                    const s = new Date(`${startDate}T${startTime || "00:00"}`)
                    const en = new Date(`${endDate}T${newTime || "00:00"}`)
                    durationRef.current = Math.max(0, en.getTime() - s.getTime())
                  }
                }} />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Location</Label>
            <LocationSearch value={location} onChange={setLocation} />
          </div>
          <div className="space-y-1">
            <Label>Image URL</Label>
            <Input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://…" />
          </div>

          {/* Published toggle */}
          <div className="flex items-center justify-between rounded-lg border px-3 py-2.5">
            <div>
              <p className="text-sm font-medium">{published ? "Published" : "Unpublished"}</p>
              <p className="text-xs text-muted-foreground">
                {published
                  ? "Visible on the website and dashboard widget"
                  : "Hidden from the website and dashboard widget"}
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={published}
              onClick={() => setPublished(!published)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                published ? "bg-primary" : "bg-border"
              }`}
            >
              <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-card shadow transform transition-transform ${
                published ? "translate-x-5" : "translate-x-0"
              }`} />
            </button>
          </div>

          {/* RSVP toggle */}
          <div className="flex items-center justify-between rounded-lg border px-3 py-2.5">
            <div>
              <p className="text-sm font-medium flex items-center gap-1.5">
                <Users className="h-4 w-4" /> "I'll be there!" RSVP
              </p>
              <p className="text-xs text-muted-foreground">
                {rsvpEnabled
                  ? "Visitors can RSVP with their name on the public event page"
                  : "Enable a simple headcount RSVP button on the public page"}
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={rsvpEnabled}
              onClick={() => setRsvpEnabled(!rsvpEnabled)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                rsvpEnabled ? "bg-primary" : "bg-border"
              }`}
            >
              <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-card shadow transform transition-transform ${
                rsvpEnabled ? "translate-x-5" : "translate-x-0"
              }`} />
            </button>
          </div>
        </TabsContent>

        {/* ── Attendees tab (RSVP) ── */}
        {rsvpEnabled && canSeeResponses && (
          <TabsContent value="attendees" className="pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">{rsvps.length}</span> attendee{rsvps.length !== 1 ? "s" : ""} so far
              </p>
              <div className="flex gap-2">
                {announceButton}
                <Button variant="outline" size="sm" onClick={exportRsvpCsv} disabled={rsvps.length === 0}>
                  <Download className="h-4 w-4 mr-1" /> Export CSV
                </Button>
              </div>
            </div>

            {loadingRsvps && <p className="text-sm text-muted-foreground">Loading…</p>}

            {!loadingRsvps && rsvps.length === 0 && (
              <p className="text-sm text-muted-foreground">No RSVPs yet.</p>
            )}

            {rsvps.length > 0 && (
              <Card>
                <CardContent className="p-0">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left px-4 py-2 font-medium text-muted-foreground">Name</th>
                        <th className="text-left px-4 py-2 font-medium text-muted-foreground">Email</th>
                        <th className="text-left px-4 py-2 font-medium text-muted-foreground">RSVP'd</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rsvps.map((r) => (
                        <tr key={r.id} className="border-b last:border-0">
                          <td className="px-4 py-2">
                            <div className="flex items-center gap-2">
                              {r.user?.avatar
                                ? <Image src={r.user.avatar} alt={r.user.name} width={24} height={24} className="h-6 w-6 rounded-full object-cover shrink-0" />
                                : <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-semibold text-primary shrink-0">{(r.user?.name ?? r.name)[0].toUpperCase()}</div>
                              }
                              {r.user
                                ? <Link href={`/mychurch/users/${r.user.id}`} className="font-medium hover:underline">{r.user.name}</Link>
                                : <span className="font-medium">{r.name}</span>
                              }
                            </div>
                          </td>
                          <td className="px-4 py-2 text-muted-foreground">{(r.user?.email ?? r.email) ?? "—"}</td>
                          <td className="px-4 py-2 text-muted-foreground">{new Date(r.createdAt).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            )}

            {/* Past announcements */}
            {announcements.length > 0 && (
              <div className="space-y-2 pt-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Past Announcements</p>
                {announcements.map((a) => (
                  <div key={a.id} className="rounded-lg border px-3 py-2 text-sm space-y-0.5">
                    <div className="flex items-center justify-between">
                      <p className="font-medium">{a.subject}</p>
                      <p className="text-xs text-muted-foreground">{new Date(a.sentAt).toLocaleString()}</p>
                    </div>
                    <p className="text-muted-foreground text-xs whitespace-pre-line">{a.message}</p>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        )}

        {/* ── Sign-up form tab ── */}
        <TabsContent value="form" className="pt-4">
          {!form ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <ClipboardList className="h-4 w-4" /> Create Sign-Up Form
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1">
                  <Label>Form title</Label>
                  <Input
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder={`${title} Sign-Up`}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Description (optional)</Label>
                  <Textarea rows={2} value={formDescription} onChange={(e) => setFormDescription(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>Start from template (optional)</Label>
                  <Select
                    value={selectedTemplateId || "none"}
                    onValueChange={(v) => setSelectedTemplateId(v === "none" ? "" : v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Blank form" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Blank form</SelectItem>
                      {templates.map((t) => (
                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={createForm} disabled={creatingForm}>
                  <Plus className="h-4 w-4 mr-1" />
                  {creatingForm ? "Creating…" : "Create Form"}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <p className="font-medium">{form.title}</p>
                  <p className="text-sm text-muted-foreground">{form._count.responses} response{form._count.responses !== 1 ? "s" : ""}</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="destructive" size="sm" onClick={deleteForm}>
                    <Trash2 className="h-4 w-4 mr-1" /> Delete Form
                  </Button>
                  <Button size="sm" onClick={saveForm} disabled={savingForm}>
                    <Save className="h-4 w-4 mr-1" />{savingForm ? "Saving…" : "Save Form"}
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Form title</Label>
                  <Input value={formTitle} onChange={(e) => setFormTitle(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>Description</Label>
                  <Input value={formDescription} onChange={(e) => setFormDescription(e.target.value)} />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="flex items-center gap-1.5">
                  <FileSpreadsheet className="h-4 w-4" /> Google Sheet URL
                  <span className="text-xs text-muted-foreground font-normal">(admin/leader only)</span>
                </Label>
                <div className="flex gap-2">
                  <Input
                    value={sheetUrl}
                    onChange={(e) => setSheetUrl(e.target.value)}
                    placeholder="https://docs.google.com/spreadsheets/…"
                  />
                  {sheetUrl && (
                    <Button variant="outline" size="icon" asChild>
                      <a href={sheetUrl} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  )}
                </div>
              </div>

              <div className="border rounded-lg p-4 space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Form Fields</p>
                <FormBuilder
                  initialFields={formFields}
                  onChange={setFormFields}
                />
              </div>
            </div>
          )}
        </TabsContent>

        {/* ── Responses tab ── */}
        {canSeeResponses && form && (
          <TabsContent value="responses" className="pt-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {responses.length} response{responses.length !== 1 ? "s" : ""}
                </p>
                <div className="flex gap-2">
                  {announceButton}
                  {form.googleSheetUrl && (
                    <Button variant="outline" size="sm" asChild>
                      <a href={form.googleSheetUrl} target="_blank" rel="noopener noreferrer">
                        <Link2 className="h-4 w-4 mr-1" /> Open Sheet
                      </a>
                    </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={exportCsv} disabled={responses.length === 0}>
                    <Download className="h-4 w-4 mr-1" /> Export CSV
                  </Button>
                </div>
              </div>

              {loadingResponses && <p className="text-sm text-muted-foreground">Loading…</p>}

              {!loadingResponses && responses.length === 0 && (
                <p className="text-sm text-muted-foreground">No responses yet.</p>
              )}

              {responses.map((r) => (
                <Card key={r.id}>
                  <CardContent className="pt-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-sm">{r.respondent ?? "Anonymous"}</p>
                      <p className="text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleString()}</p>
                    </div>
                    <div className="space-y-1 pl-2 border-l-2 border-muted">
                      {r.fieldValues.filter((fv) => fv.value).map((fv) => (
                        <div key={fv.fieldId}>
                          <p className="text-xs text-muted-foreground">{fv.field.label}</p>
                          <p className="text-sm">{fv.value}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}

              {/* Past announcements */}
              {announcements.length > 0 && (
                <div className="space-y-2 pt-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Past Announcements</p>
                  {announcements.map((a) => (
                    <div key={a.id} className="rounded-lg border px-3 py-2 text-sm space-y-0.5">
                      <div className="flex items-center justify-between">
                        <p className="font-medium">{a.subject}</p>
                        <p className="text-xs text-muted-foreground">{new Date(a.sentAt).toLocaleString()}</p>
                      </div>
                      <p className="text-muted-foreground text-xs whitespace-pre-line">{a.message}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        )}
      </Tabs>

      {/* ── Announcement dialog ── */}
      <Dialog open={showAnnounceDialog} onOpenChange={setShowAnnounceDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Megaphone className="h-5 w-5" /> Send Announcement
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <p className="text-sm text-muted-foreground">
              This will be recorded and visible to admins. Use your own email tool to actually deliver it to attendees.
            </p>
            {hasAttendees && (
              <p className="text-xs bg-muted rounded px-2 py-1.5">
                Recipients: {rsvpEnabled ? `${rsvps.length} RSVP${rsvps.length !== 1 ? "s" : ""}` : ""}
                {rsvpEnabled && form ? " + " : ""}
                {form ? `${responses.length} form response${responses.length !== 1 ? "s" : ""}` : ""}
              </p>
            )}
            <div className="space-y-1">
              <Label>Subject</Label>
              <Input value={annSubject} onChange={(e) => setAnnSubject(e.target.value)} placeholder="Event update" />
            </div>
            <div className="space-y-1">
              <Label>Message</Label>
              <Textarea rows={5} value={annMessage} onChange={(e) => setAnnMessage(e.target.value)} placeholder="Write your message here…" />
            </div>
            <Button onClick={sendAnnouncement} disabled={sendingAnn} className="w-full">
              <Send className="h-4 w-4 mr-1" />
              {sendingAnn ? "Saving…" : "Record Announcement"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
