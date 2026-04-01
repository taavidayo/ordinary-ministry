"use client"

import { useState, useRef, useEffect } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Trash2, Upload, X } from "lucide-react"
import { TIMEZONES, getUtcOffset } from "@/lib/timezones"

function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

const ROLES = ["VISITOR", "MEMBER", "LEADER", "ADMIN"] as const
const FEATURES = [
  { key: "services",  label: "Services" },
  { key: "teams",     label: "Teams" },
  { key: "chat",      label: "Chat" },
  { key: "users",     label: "Users" },
  { key: "offerings", label: "Giving" },
  { key: "sermons",   label: "Sermons" },
  { key: "events",    label: "Events" },
] as const

interface CustomLabel { id: string; label: string; description: string }

const DEFAULT_PERMISSIONS = {
  features: { services: "VISITOR", teams: "MEMBER", chat: "VISITOR", users: "LEADER", offerings: "LEADER", sermons: "VISITOR", events: "VISITOR" },
  roles: {
    VISITOR: { label: "Visitor",  description: "New or guest attendees tracked for people care." },
    MEMBER:  { label: "Member",   description: "Regular church members." },
    LEADER:  { label: "Leader",   description: "Ministry leaders and volunteers." },
    ADMIN:   { label: "Admin",    description: "Full administrative access." },
  },
  customLabels: [] as CustomLabel[],
}

interface Settings {
  id: string
  name: string
  logoUrl: string | null
  timezone: string
  permissions: unknown
  stripePublishableKey: string | null
  stripeSecretKey: string | null
  stripeWebhookSecret: string | null
}

export default function SettingsManager({ settings: init }: { settings: Settings }) {
  const perms = (init.permissions as typeof DEFAULT_PERMISSIONS | null) ?? DEFAULT_PERMISSIONS

  const [name, setName] = useState(init.name)
  const [logoUrl, setLogoUrl] = useState(init.logoUrl ?? "")
  const [timezone, setTimezone] = useState(init.timezone ?? "UTC")
  const logoInputRef = useRef<HTMLInputElement>(null)

  const [saveStatus, setSaveStatus] = useState<"" | "saving" | "saved">("")
  const isMountedBrand = useRef(false)
  const isMountedPerm = useRef(false)

  const [stripePk, setStripePk] = useState(init.stripePublishableKey ?? "")
  const [stripeSk, setStripeSk] = useState(init.stripeSecretKey ?? "")
  const [stripeWh, setStripeWh] = useState(init.stripeWebhookSecret ?? "")
  const [stripeSaving, setStripeSaving] = useState(false)
  const [stripeSaved, setStripeSaved] = useState(false)

  async function handleLogoFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) { toast.error("Logo must be under 2 MB"); return }
    const dataUrl = await readFileAsDataURL(file)
    setLogoUrl(dataUrl)
    e.target.value = ""
  }

  const [features, setFeatures] = useState<Record<string, string>>(
    { ...DEFAULT_PERMISSIONS.features, ...(perms.features ?? {}) }
  )
  const [roleMeta, setRoleMeta] = useState<Record<string, { label: string; description: string }>>(
    { ...DEFAULT_PERMISSIONS.roles, ...(perms.roles ?? {}) }
  )
  const [customLabels, setCustomLabels] = useState<CustomLabel[]>(
    (perms as typeof DEFAULT_PERMISSIONS).customLabels ?? []
  )
  function addCustomLabel() {
    setCustomLabels([...customLabels, { id: crypto.randomUUID(), label: "", description: "" }])
  }

  function updateCustomLabel(id: string, field: keyof CustomLabel, value: string) {
    setCustomLabels(customLabels.map((l) => l.id === id ? { ...l, [field]: value } : l))
  }

  function removeCustomLabel(id: string) {
    setCustomLabels(customLabels.filter((l) => l.id !== id))
  }

  async function saveBranding() {
    setSaveStatus("saving")
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, logoUrl: logoUrl || null, timezone }),
    })
    if (res.ok) {
      setSaveStatus("saved")
      setTimeout(() => setSaveStatus(""), 2000)
    } else {
      setSaveStatus("")
      toast.error("Failed to save branding")
    }
  }

  async function savePermissions() {
    setSaveStatus("saving")
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ permissions: { features, roles: roleMeta, customLabels } }),
    })
    if (res.ok) {
      setSaveStatus("saved")
      setTimeout(() => setSaveStatus(""), 2000)
    } else {
      setSaveStatus("")
      toast.error("Failed to save permissions")
    }
  }

  async function saveStripe() {
    setStripeSaving(true)
    const body: Record<string, string | null> = { stripePublishableKey: stripePk || null }
    if (!stripeSk.includes("****")) body.stripeSecretKey = stripeSk || null
    if (!stripeWh.includes("****")) body.stripeWebhookSecret = stripeWh || null
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    setStripeSaving(false)
    if (res.ok) {
      setStripeSaved(true)
      setTimeout(() => setStripeSaved(false), 2000)
    } else {
      toast.error("Failed to save Stripe keys")
    }
  }

  // Auto-save branding with 800 ms debounce
  useEffect(() => {
    if (!isMountedBrand.current) { isMountedBrand.current = true; return }
    const timer = setTimeout(() => { saveBranding() }, 800)
    return () => clearTimeout(timer)
  }, [name, logoUrl, timezone]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-save permissions with 800 ms debounce
  useEffect(() => {
    if (!isMountedPerm.current) { isMountedPerm.current = true; return }
    const timer = setTimeout(() => { savePermissions() }, 800)
    return () => clearTimeout(timer)
  }, [features, roleMeta, customLabels]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-6">
      {/* ── Auto-save status ── */}
      <div className="flex justify-end h-4">
        {saveStatus === "saving" && <span className="text-xs text-muted-foreground">Saving…</span>}
        {saveStatus === "saved"  && <span className="text-xs text-emerald-600">Saved</span>}
      </div>
      {/* ── Branding ── */}
      <Card>
        <CardHeader><CardTitle className="text-base">Branding</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Ministry Name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ordinary Ministry" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Logo</label>
            <div className="flex items-center gap-3">
              {logoUrl && (
                <img src={logoUrl} alt="Logo preview" className="h-10 w-10 object-contain rounded border p-1 shrink-0" />
              )}
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => logoInputRef.current?.click()}>
                  <Upload className="h-3.5 w-3.5" />
                  {logoUrl ? "Replace" : "Upload"}
                </Button>
                {logoUrl && (
                  <Button type="button" variant="ghost" size="sm" className="gap-1.5 text-muted-foreground" onClick={() => setLogoUrl("")}>
                    <X className="h-3.5 w-3.5" />
                    Remove
                  </Button>
                )}
              </div>
              <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoFile} />
            </div>
            <p className="text-xs text-muted-foreground">JPG, PNG, SVG up to 2 MB.</p>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Timezone</label>
            <Select value={timezone} onValueChange={setTimezone}>
              <SelectTrigger className="text-sm">
                <SelectValue placeholder="Select timezone…" />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {TIMEZONES.map((tz) => (
                  <SelectItem key={tz.value} value={tz.value}>({getUtcOffset(tz.value)}) {tz.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* ── Role Labels ── */}
      <Card>
        <CardHeader><CardTitle className="text-base">Permission Level Labels</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground">Customise the display names and descriptions shown for each role.</p>
          {ROLES.map((role) => (
            <div key={role} className="grid grid-cols-2 gap-3 pb-3 border-b last:border-0 last:pb-0">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">{role} — Label</label>
                <Input
                  value={roleMeta[role]?.label ?? role}
                  onChange={(e) => setRoleMeta({ ...roleMeta, [role]: { ...roleMeta[role], label: e.target.value } })}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">{role} — Description</label>
                <Textarea
                  value={roleMeta[role]?.description ?? ""}
                  onChange={(e) => setRoleMeta({ ...roleMeta, [role]: { ...roleMeta[role], description: e.target.value } })}
                  rows={1}
                  className="text-sm resize-none"
                />
              </div>
            </div>
          ))}

          {customLabels.length > 0 && (
            <div className="pt-2 space-y-3">
              <p className="text-xs font-medium text-muted-foreground">Custom Labels</p>
              {customLabels.map((cl) => (
                <div key={cl.id} className="grid grid-cols-2 gap-3 pb-3 border-b last:border-0 last:pb-0">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Label</label>
                    <Input
                      value={cl.label}
                      onChange={(e) => updateCustomLabel(cl.id, "label", e.target.value)}
                      placeholder="e.g. Elder, Deacon…"
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1 space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">Description</label>
                      <Textarea
                        value={cl.description}
                        onChange={(e) => updateCustomLabel(cl.id, "description", e.target.value)}
                        rows={1}
                        className="text-sm resize-none"
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive self-end shrink-0"
                      onClick={() => removeCustomLabel(cl.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <Button variant="outline" size="sm" onClick={addCustomLabel} className="mt-1">
            <Plus className="h-3.5 w-3.5 mr-1" /> Add Permission Label
          </Button>
        </CardContent>
      </Card>

      {/* ── Feature Access ── */}
      <Card>
        <CardHeader><CardTitle className="text-base">Feature Access</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Set the minimum role required to access each section. Admins always have full access.
          </p>
          <div className="space-y-2">
            {FEATURES.map(({ key, label }) => (
              <div key={key} className="flex items-center justify-between gap-4">
                <span className="text-sm font-medium w-28">{label}</span>
                <Select value={features[key]} onValueChange={(v) => setFeatures({ ...features, [key]: v })}>
                  <SelectTrigger className="h-8 text-sm w-44">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map((r) => (
                      <SelectItem key={r} value={r}>{r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── Stripe Connection ── */}
      <Card>
        <CardHeader><CardTitle className="text-base">Stripe Connection</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Connect your Stripe account to accept online giving. Find your keys in the{" "}
            <span className="font-medium text-foreground">Stripe Dashboard → Developers → API keys</span>.
          </p>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Publishable Key</label>
            <Input
              value={stripePk}
              onChange={(e) => setStripePk(e.target.value)}
              placeholder="pk_live_..."
              className="font-mono text-xs"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Secret Key</label>
            <Input
              type="password"
              value={stripeSk}
              onChange={(e) => setStripeSk(e.target.value)}
              placeholder="sk_live_..."
              className="font-mono text-xs"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Webhook Secret</label>
            <Input
              type="password"
              value={stripeWh}
              onChange={(e) => setStripeWh(e.target.value)}
              placeholder="whsec_..."
              className="font-mono text-xs"
            />
            <p className="text-xs text-muted-foreground">
              In Stripe Dashboard, create a webhook pointing to <code className="bg-muted px-1 rounded text-[11px]">/api/webhooks/stripe</code> with the <code className="bg-muted px-1 rounded text-[11px]">checkout.session.completed</code> event.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button size="sm" onClick={saveStripe} disabled={stripeSaving}>
              {stripeSaving ? "Saving…" : "Save Keys"}
            </Button>
            {stripeSaved && <span className="text-xs text-emerald-600">Saved</span>}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
