"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Check, Plus, Trash2 } from "lucide-react"
import { TIMEZONES, getUtcOffset } from "@/lib/timezones"

const ROLES = ["VISITOR", "MEMBER", "LEADER", "ADMIN"] as const
const FEATURES = [
  { key: "services",  label: "Services" },
  { key: "teams",     label: "Teams" },
  { key: "users",     label: "Users" },
  { key: "offerings", label: "Offerings" },
  { key: "sermons",   label: "Sermons" },
  { key: "events",    label: "Events" },
] as const

interface CustomLabel { id: string; label: string; description: string }

const DEFAULT_PERMISSIONS = {
  features: { services: "VISITOR", teams: "MEMBER", users: "LEADER", offerings: "LEADER", sermons: "VISITOR", events: "VISITOR" },
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
}

export default function SettingsManager({ settings: init }: { settings: Settings }) {
  const perms = (init.permissions as typeof DEFAULT_PERMISSIONS | null) ?? DEFAULT_PERMISSIONS

  const [name, setName] = useState(init.name)
  const [logoUrl, setLogoUrl] = useState(init.logoUrl ?? "")
  const [timezone, setTimezone] = useState(init.timezone ?? "UTC")
  const [brandSaving, setBrandSaving] = useState(false)

  const [features, setFeatures] = useState<Record<string, string>>(
    { ...DEFAULT_PERMISSIONS.features, ...(perms.features ?? {}) }
  )
  const [roleMeta, setRoleMeta] = useState<Record<string, { label: string; description: string }>>(
    { ...DEFAULT_PERMISSIONS.roles, ...(perms.roles ?? {}) }
  )
  const [customLabels, setCustomLabels] = useState<CustomLabel[]>(
    (perms as typeof DEFAULT_PERMISSIONS).customLabels ?? []
  )
  const [permSaving, setPermSaving] = useState(false)

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
    setBrandSaving(true)
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, logoUrl: logoUrl || null, timezone }),
    })
    setBrandSaving(false)
    res.ok ? toast.success("Branding saved") : toast.error("Failed to save branding")
  }

  async function savePermissions() {
    setPermSaving(true)
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ permissions: { features, roles: roleMeta, customLabels } }),
    })
    setPermSaving(false)
    res.ok ? toast.success("Permissions saved") : toast.error("Failed to save permissions")
  }

  return (
    <div className="space-y-6">
      {/* ── Branding ── */}
      <Card>
        <CardHeader><CardTitle className="text-base">Branding</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Ministry Name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ordinary Ministry" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Logo URL</label>
            <Input value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://…/logo.png" />
            {logoUrl && (
              <img src={logoUrl} alt="Logo preview" className="mt-2 h-12 object-contain rounded border p-1" />
            )}
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
          <Button size="sm" onClick={saveBranding} disabled={brandSaving}>
            <Check className="h-3.5 w-3.5 mr-1" /> {brandSaving ? "Saving…" : "Save Branding"}
          </Button>
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
          <Button size="sm" onClick={savePermissions} disabled={permSaving} className="mt-2">
            <Check className="h-3.5 w-3.5 mr-1" /> {permSaving ? "Saving…" : "Save Permissions"}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
