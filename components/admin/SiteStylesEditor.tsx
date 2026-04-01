"use client"

import { useState, useEffect } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { ChevronDown, ChevronRight } from "lucide-react"
import { type SiteStyleConfig } from "@/lib/page-blocks"

// ─── Google Fonts ──────────────────────────────────────────────────────────────

export const GOOGLE_FONTS = [
  "Inter", "Lato", "Raleway", "Nunito", "Poppins", "Montserrat", "Oswald",
  "Roboto", "Open Sans", "Source Sans Pro", "Ubuntu", "Mulish", "Outfit",
  "Playfair Display", "Merriweather", "Libre Baskerville", "PT Serif", "Lora",
  "EB Garamond", "Cormorant Garamond", "DM Sans", "Plus Jakarta Sans",
]

export function loadGoogleFont(fontName: string) {
  if (typeof document === "undefined") return
  const id = `gfont-${fontName.replace(/\s+/g, "-").toLowerCase()}`
  if (document.getElementById(id)) return
  const link = document.createElement("link")
  link.id = id
  link.rel = "stylesheet"
  link.href = `https://fonts.googleapis.com/css2?family=${fontName.replace(/ /g, "+")}:wght@400;600;700&display=swap`
  document.head.appendChild(link)
}

const SYSTEM_FONT_PRESETS = [
  { label: "System sans-serif", value: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" },
  { label: "Serif", value: "Georgia, 'Times New Roman', serif" },
  { label: "Monospace", value: "'Courier New', Courier, monospace" },
]

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</Label>
      {hint && <p className="text-xs text-muted-foreground -mt-1">{hint}</p>}
      {children}
    </div>
  )
}

function FontSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [gSearch, setGSearch] = useState("")
  const isGoogle = GOOGLE_FONTS.some(f => value.includes(f))
  const selectedGfont = GOOGLE_FONTS.find(f => value.includes(f)) ?? null
  const isSystem = SYSTEM_FONT_PRESETS.some(p => p.value === value)
  const isCustom = !isGoogle && !isSystem && value !== ""
  const filteredGFonts = gSearch
    ? GOOGLE_FONTS.filter(f => f.toLowerCase().includes(gSearch.toLowerCase()))
    : GOOGLE_FONTS

  // Load selected Google font
  useEffect(() => {
    if (selectedGfont) loadGoogleFont(selectedGfont)
  }, [selectedGfont])

  return (
    <div className="space-y-2">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">System Fonts</p>
      <div className="flex flex-wrap gap-1">
        {SYSTEM_FONT_PRESETS.map(p => (
          <button key={p.label} type="button" onClick={() => onChange(p.value)}
            className={`text-xs px-2 py-1 rounded border transition-colors ${p.value === value ? "bg-primary text-primary-foreground border-primary" : "hover:bg-accent/50 border-gray-200"}`}>
            {p.label}
          </button>
        ))}
      </div>
      <div className="space-y-1.5">
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">Google Fonts</p>
        <Input
          value={gSearch}
          onChange={e => setGSearch(e.target.value)}
          placeholder="Search Google Fonts…"
          className="h-7 text-xs"
        />
        <div className="flex flex-wrap gap-1 max-h-28 overflow-y-auto border rounded p-1.5 bg-muted/50">
          {filteredGFonts.map(f => (
            <button key={f} type="button"
              onClick={() => { loadGoogleFont(f); onChange(`"${f}", sans-serif`) }}
              className={`text-xs px-2 py-1 rounded border transition-colors ${selectedGfont === f ? "bg-primary text-primary-foreground border-primary" : "bg-card hover:bg-accent/50 border-gray-200"}`}
              style={{ fontFamily: `"${f}", sans-serif` }}>
              {f}
            </button>
          ))}
          {filteredGFonts.length === 0 && <p className="text-xs text-muted-foreground px-1">No fonts match</p>}
        </div>
      </div>
      <Input
        value={value ?? ""}
        placeholder="Custom font-family value…"
        onChange={e => onChange(e.target.value)}
        className={isCustom ? "border-primary" : ""}
      />
    </div>
  )
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</Label>
      <div className="flex items-center gap-2">
        <input type="color" value={value || "#111827"} onChange={e => onChange(e.target.value)}
          className="h-9 w-12 rounded border cursor-pointer p-0.5" />
        <Input value={value ?? ""} placeholder="#111827" onChange={e => onChange(e.target.value)} />
      </div>
    </div>
  )
}

function Section({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <section>
      <button type="button" onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 w-full text-left mb-3 group">
        {open ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
        <h2 className="font-semibold group-hover:text-primary transition-colors">{title}</h2>
      </button>
      {open && <div className="space-y-5 pl-2">{children}</div>}
    </section>
  )
}

export default function SiteStylesEditor({ initial }: { initial: SiteStyleConfig }) {
  const [styles, setStyles] = useState<SiteStyleConfig>(initial)
  const [saving, setSaving] = useState(false)

  function set(k: keyof SiteStyleConfig, v: string) {
    setStyles(prev => ({ ...prev, [k]: v || undefined }))
  }

  async function save() {
    setSaving(true)
    try {
      const res = await fetch("/api/site-styles", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ styles }),
      })
      if (!res.ok) { toast.error("Failed to save"); return }
      toast.success("Site styles saved")
    } catch {
      toast.error("Failed to save")
    } finally {
      setSaving(false)
    }
  }

  const lbl = "text-xs font-medium text-muted-foreground uppercase tracking-wide"

  return (
    <div className="max-w-2xl space-y-8">

      <Section title="Typography">
        <p className="text-sm text-muted-foreground -mt-2">
          Controls font styles for all rich text and page content. Leave a field blank to use the default.
        </p>
        <Field label="Heading Font" hint="Applied to H1, H2, H3 in all text blocks">
          <FontSelect value={styles.headingFont ?? ""} onChange={v => set("headingFont", v)} />
        </Field>
        <Field label="Body Font" hint="Applied to paragraphs and body copy">
          <FontSelect value={styles.bodyFont ?? ""} onChange={v => set("bodyFont", v)} />
        </Field>
        <Separator />
        <div className="grid grid-cols-2 gap-4">
          {([
            ["H1 Size", "h1Size", "2rem"], ["H1 Weight", "h1Weight", "700"],
            ["H2 Size", "h2Size", "1.5rem"], ["H2 Weight", "h2Weight", "600"],
            ["H3 Size", "h3Size", "1.25rem"], ["H3 Weight", "h3Weight", "600"],
            ["Body Size", "bodySize", "1rem"], ["Body Line Height", "bodyLineHeight", "1.7"],
          ] as [string, keyof SiteStyleConfig, string][]).map(([label, key, placeholder]) => (
            <div key={key} className="space-y-1.5">
              <Label className={lbl}>{label}</Label>
              <Input value={styles[key] ?? ""} placeholder={placeholder} onChange={e => set(key, e.target.value)} />
            </div>
          ))}
        </div>
      </Section>

      <Separator />

      <Section title="Colors">
        <p className="text-sm text-muted-foreground -mt-2">
          Brand colors used in links, buttons, and accents across the public site.
        </p>
        <ColorField label="Primary Color" value={styles.primaryColor ?? ""} onChange={v => set("primaryColor", v)} />
        <ColorField label="Secondary Color" value={styles.secondaryColor ?? ""} onChange={v => set("secondaryColor", v)} />
        <ColorField label="Tertiary Color" value={styles.tertiaryColor ?? ""} onChange={v => set("tertiaryColor", v)} />
      </Section>

      <div className="flex items-center gap-3 pt-2">
        <Button onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save Styles"}
        </Button>
        <p className="text-xs text-muted-foreground">Changes take effect immediately on the public site.</p>
      </div>
    </div>
  )
}
