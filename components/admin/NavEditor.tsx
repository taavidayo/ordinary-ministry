"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Plus, Trash2, X } from "lucide-react"
import { type NavConfigData, type NavSocialLink } from "@/lib/nav-config"

interface Props {
  open: boolean
  onClose: () => void
  config: NavConfigData
  onChange: (c: NavConfigData) => void
  onSave: () => void
  saving: boolean
  inline?: boolean  // render just the body content without the outer panel shell
}

function SliderRow({
  label, value, min, max, unit = "px", onChange,
}: {
  label: string; value: number; min: number; max: number; unit?: string
  onChange: (v: number) => void
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <Label className="text-xs">{label}</Label>
        <span className="text-xs text-muted-foreground tabular-nums w-12 text-right">{value}{unit}</span>
      </div>
      <input type="range" min={min} max={max} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full accent-primary h-1.5" />
    </div>
  )
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between cursor-pointer">
      <span className="text-xs">{label}</span>
      <button type="button" onClick={() => onChange(!checked)}
        className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors ${checked ? "bg-primary" : "bg-border"}`}>
        <span className={`inline-block h-3 w-3 transform rounded-full bg-card shadow transition-transform ${checked ? "translate-x-3.5" : "translate-x-0.5"}`} />
      </button>
    </label>
  )
}

function ColorRow({
  label, value, onChange, allowTransparent = false,
}: {
  label: string; value: string; onChange: (v: string) => void; allowTransparent?: boolean
}) {
  const isTransparent = value === "transparent"
  return (
    <div className="flex items-center justify-between gap-2">
      <Label className="text-xs shrink-0">{label}</Label>
      <div className="flex items-center gap-1.5">
        {allowTransparent && (
          <button
            type="button"
            title="Transparent"
            onClick={() => onChange(isTransparent ? "#ffffff" : "transparent")}
            className={`h-6 w-6 rounded border text-[9px] font-mono transition-colors shrink-0 ${isTransparent ? "bg-primary text-primary-foreground border-primary" : "text-muted-foreground border-gray-200 hover:border-gray-400"}`}
            style={isTransparent ? {} : { background: "repeating-conic-gradient(#ccc 0% 25%, white 0% 50%) 0 0 / 8px 8px" }}
          >
            {isTransparent ? "T" : ""}
          </button>
        )}
        {!isTransparent && (
          <div className="flex items-center gap-1.5 border rounded px-1.5 py-0.5">
            <input type="color" value={value} onChange={e => onChange(e.target.value)}
              className="h-4 w-4 cursor-pointer rounded border-0 p-0 bg-transparent" />
            <span className="text-xs text-muted-foreground font-mono">{value}</span>
          </div>
        )}
        {isTransparent && (
          <span className="text-xs text-muted-foreground italic">Transparent</span>
        )}
      </div>
    </div>
  )
}

const PLATFORMS = ["Instagram", "YouTube", "Twitter/X", "Facebook", "LinkedIn", "TikTok", "Other"]
const PLATFORM_ICONS: Record<string, NavSocialLink["icon"]> = {
  Instagram: "instagram", YouTube: "youtube", "Twitter/X": "twitter",
  Facebook: "facebook", LinkedIn: "linkedin", TikTok: "tiktok", Other: "link",
}

export function NavStylesBody({ config, onChange }: { config: NavConfigData; onChange: (c: NavConfigData) => void }) {
  const [newPlatform, setNewPlatform] = useState("Instagram")
  const [newUrl, setNewUrl] = useState("")

  function set<K extends keyof NavConfigData>(key: K, value: NavConfigData[K]) {
    onChange({ ...config, [key]: value })
  }
  function setBorder<K extends keyof NavConfigData["border"]>(key: K, value: NavConfigData["border"][K]) {
    onChange({ ...config, border: { ...config.border, [key]: value } })
  }
  function setShadow<K extends keyof NavConfigData["shadow"]>(key: K, value: NavConfigData["shadow"][K]) {
    onChange({ ...config, shadow: { ...config.shadow, [key]: value } })
  }
  function setDropdownBorder<K extends keyof NavConfigData["dropdownBorder"]>(key: K, value: NavConfigData["dropdownBorder"][K]) {
    const db = config.dropdownBorder ?? { show: true, color: "#e5e7eb", width: 1, style: "solid" as const }
    onChange({ ...config, dropdownBorder: { ...db, [key]: value } })
  }
  function addSocialLink() {
    if (!newUrl.trim()) return
    const link: NavSocialLink = { platform: newPlatform, url: newUrl.trim(), icon: PLATFORM_ICONS[newPlatform] ?? "link" }
    set("socialLinks", [...(config.socialLinks ?? []), link])
    setNewUrl("")
  }

  return (
    <div className="space-y-4 text-sm">

        {/* Appearance */}
        <div className="space-y-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Appearance</p>
          <SliderRow label="Height" value={config.height} min={32} max={120} onChange={v => set("height", v)} />
          <SliderRow label="Link Spacing" value={config.linkSpacing} min={8} max={64} onChange={v => set("linkSpacing", v)} />

          <div className="space-y-1">
            <Label className="text-xs">Color Mode</Label>
            <div className="flex rounded-md overflow-hidden border text-xs">
              {(["static", "adaptive"] as const).map(mode => (
                <button key={mode} type="button" onClick={() => set("colorMode", mode)}
                  className={`flex-1 py-1 capitalize transition-colors ${config.colorMode === mode ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-accent/50"}`}>
                  {mode}
                </button>
              ))}
            </div>
          </div>

          {config.colorMode === "static" ? (
            <div className="space-y-2">
              <ColorRow label="Background" value={config.staticBg} onChange={v => set("staticBg", v)} allowTransparent />
              <ColorRow label="Text" value={config.staticText} onChange={v => set("staticText", v)} />
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-2">
                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Over light sections</p>
                <ColorRow label="Nav bg" value={config.adaptiveLightBg} onChange={v => set("adaptiveLightBg", v)} allowTransparent />
                <ColorRow label="Text" value={config.adaptiveLightText} onChange={v => set("adaptiveLightText", v)} />
              </div>
              <div className="space-y-2">
                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Over dark sections</p>
                <ColorRow label="Nav bg" value={config.adaptiveDarkBg} onChange={v => set("adaptiveDarkBg", v)} allowTransparent />
                <ColorRow label="Text" value={config.adaptiveDarkText} onChange={v => set("adaptiveDarkText", v)} />
              </div>
            </div>
          )}
        </div>

        <Separator />

        {/* Behavior */}
        <div className="space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Behavior</p>
          <Toggle label="Fixed on scroll" checked={config.fixed} onChange={v => set("fixed", v)} />
          <Toggle label="Overlay content" checked={config.overlay ?? false} onChange={v => set("overlay", v)} />
          {(config.overlay ?? false) && (
            <div className="pl-2 border-l-2 border-gray-100 space-y-1">
              <p className="text-[10px] text-muted-foreground">Nav bg in overlay mode</p>
              <ColorRow label="Overlay bg" value={config.overlayBg ?? "transparent"} onChange={v => set("overlayBg", v)} allowTransparent />
            </div>
          )}
        </div>

        <Separator />

        {/* Border */}
        <div className="space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Border</p>
          <Toggle label="Show border" checked={config.border.show} onChange={v => setBorder("show", v)} />
          {config.border.show && (
            <div className="space-y-2 pl-2 border-l-2 border-gray-100">
              <ColorRow label="Color" value={config.border.color} onChange={v => setBorder("color", v)} />
              <div className="flex items-center justify-between gap-2">
                <Label className="text-xs shrink-0">Style</Label>
                <Select value={config.border.style} onValueChange={v => setBorder("style", v as "solid" | "dashed" | "dotted")}>
                  <SelectTrigger className="h-7 text-xs w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="solid">Solid</SelectItem>
                    <SelectItem value="dashed">Dashed</SelectItem>
                    <SelectItem value="dotted">Dotted</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <SliderRow label="Width" value={config.border.width} min={1} max={8} onChange={v => setBorder("width", v)} />
            </div>
          )}
        </div>

        <Separator />

        {/* Shadow */}
        <div className="space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Drop Shadow</p>
          <Toggle label="Show shadow" checked={config.shadow.show} onChange={v => setShadow("show", v)} />
          {config.shadow.show && (
            <div className="space-y-2 pl-2 border-l-2 border-gray-100">
              <ColorRow label="Color" value={config.shadow.color} onChange={v => setShadow("color", v)} />
              <SliderRow label="Opacity" value={config.shadow.opacity} min={0} max={100} unit="%" onChange={v => setShadow("opacity", v)} />
              <SliderRow label="Blur" value={config.shadow.blur} min={0} max={40} onChange={v => setShadow("blur", v)} />
              <SliderRow label="Spread" value={config.shadow.spread} min={-10} max={20} onChange={v => setShadow("spread", v)} />
              <SliderRow label="Distance" value={config.shadow.distance} min={0} max={30} onChange={v => setShadow("distance", v)} />
            </div>
          )}
        </div>

        <Separator />

        {/* Dropdown */}
        <div className="space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Dropdown Menu</p>
          <Toggle label="Show dropdown arrows" checked={config.showDropdownArrow ?? false} onChange={v => set("showDropdownArrow", v)} />
          <ColorRow label="Background" value={config.dropdownBg ?? "#ffffff"} onChange={v => set("dropdownBg", v)} allowTransparent />
          <SliderRow label="Corner Radius" value={config.dropdownRadius ?? 8} min={0} max={24} unit="px" onChange={v => set("dropdownRadius", v)} />
          <Toggle label="Show border" checked={config.dropdownBorder?.show ?? true} onChange={v => setDropdownBorder("show", v)} />
          {(config.dropdownBorder?.show ?? true) && (
            <div className="space-y-2 pl-2 border-l-2 border-gray-100">
              <ColorRow label="Color" value={config.dropdownBorder?.color ?? "#e5e7eb"} onChange={v => setDropdownBorder("color", v)} />
              <div className="flex items-center justify-between gap-2">
                <Label className="text-xs shrink-0">Style</Label>
                <Select
                  value={config.dropdownBorder?.style ?? "solid"}
                  onValueChange={v => setDropdownBorder("style", v as "solid" | "dashed" | "dotted")}
                >
                  <SelectTrigger className="h-7 text-xs w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="solid">Solid</SelectItem>
                    <SelectItem value="dashed">Dashed</SelectItem>
                    <SelectItem value="dotted">Dotted</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <SliderRow label="Width" value={config.dropdownBorder?.width ?? 1} min={1} max={8} onChange={v => setDropdownBorder("width", v)} />
            </div>
          )}
        </div>

        <Separator />

        {/* Elements */}
        <div className="space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Elements</p>
          <Toggle label="Show social icons" checked={config.showSocialIcons} onChange={v => set("showSocialIcons", v)} />
          {config.showSocialIcons && (
            <div className="space-y-1.5 pl-2 border-l-2 border-gray-100">
              {(config.socialLinks ?? []).map((link, i) => (
                <div key={i} className="flex items-center gap-1.5 text-xs">
                  <span className="font-medium w-16 truncate">{link.platform}</span>
                  <span className="flex-1 text-muted-foreground truncate">{link.url}</span>
                  <button type="button" onClick={() => set("socialLinks", config.socialLinks.filter((_, idx) => idx !== i))}
                    className="text-red-400 hover:text-red-600 shrink-0">
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
              <div className="flex gap-1.5 items-center pt-1">
                <Select value={newPlatform} onValueChange={setNewPlatform}>
                  <SelectTrigger className="h-6 text-xs w-24 shrink-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PLATFORMS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Input value={newUrl} onChange={e => setNewUrl(e.target.value)} placeholder="https://…"
                  className="h-6 text-xs flex-1"
                  onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addSocialLink() } }} />
                <button type="button" onClick={addSocialLink}
                  className="h-6 w-6 flex items-center justify-center rounded border text-muted-foreground hover:text-foreground shrink-0">
                  <Plus className="h-3 w-3" />
                </button>
              </div>
            </div>
          )}
        </div>
    </div>
  )
}

export default function NavEditor({ open, onClose, config, onChange, onSave, saving }: Props) {
  if (!open) return null

  return (
    /* Floating panel — no backdrop */
    <div className="fixed top-[60px] right-4 z-50 w-72 bg-card border rounded-xl shadow-xl flex flex-col max-h-[calc(100vh-80px)]">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b shrink-0">
        <span className="text-sm font-semibold">Navigation Style</span>
        <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Scrollable body */}
      <div className="overflow-y-auto flex-1 px-3 py-3">
        <NavStylesBody config={config} onChange={onChange} />
      </div>

      {/* Footer */}
      <div className="flex justify-end gap-2 px-3 py-2.5 border-t shrink-0">
        <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
        <Button size="sm" onClick={onSave} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
      </div>
    </div>
  )
}
