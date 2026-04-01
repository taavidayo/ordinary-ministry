"use client"

import { useState, useCallback, useId, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import ReactGridLayout, { type Layout } from "react-grid-layout"
import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import TiptapUnderline from "@tiptap/extension-underline"
import TiptapPlaceholder from "@tiptap/extension-placeholder"
import TiptapLink from "@tiptap/extension-link"
import TiptapColor from "@tiptap/extension-color"
import TiptapTextStyle from "@tiptap/extension-text-style"
import TiptapFontFamily from "@tiptap/extension-font-family"
import TiptapHighlight from "@tiptap/extension-highlight"
import TiptapTextAlign from "@tiptap/extension-text-align"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import {
  ArrowLeft,
  Trash2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Highlighter,
  Type,
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Heading3,
  Plus,
  Copy,
  Monitor,
  Tablet,
  Smartphone,
  Pin,
  PinOff,
  Settings2,
  ChevronUp,
  ChevronDown,
  ChevronRight,
  Eye,
  Pencil,
  Upload,
  Link as LinkIcon,
  X,
  Layers,
  Palette,
} from "lucide-react"
import {
  type PageBlock,
  type PageSection,
  type BlockType,
  type SiteStyleConfig,
  defaultBlock,
  parseSiteStyles,
  siteStylesCss,
} from "@/lib/page-blocks"
import PageBlockRenderer from "@/components/public/PageBlockRenderer"
import {
  type NavConfigData,
  DEFAULT_NAV_CONFIG,
  parseNavConfig,
  buildPublicNavFromTree,
  navBoxShadow,
} from "@/lib/nav-config"
import NavEditor, { NavStylesBody } from "@/components/admin/NavEditor"
import LinkPicker from "@/components/admin/LinkPicker"
import { GOOGLE_FONTS, loadGoogleFont } from "@/components/admin/SiteStylesEditor"

// ─── Types ───────────────────────────────────────────────────────────────────

interface PageBuilderProps {
  initialSections: PageSection[]
  initialTitle: string
  initialSlug: string
  initialPublished: boolean
  initialNavLabel?: string
}

type PreviewMode = "desktop" | "tablet" | "mobile"
const PREVIEW_WIDTH: Record<PreviewMode, number | null> = {
  desktop: null, tablet: 768, mobile: 390,
}

// ─── Font presets ─────────────────────────────────────────────────────────────

const FONT_PRESETS = [
  { label: "System", value: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" },
  { label: "Serif",  value: "Georgia, 'Times New Roman', serif" },
  { label: "Mono",   value: "'Courier New', Courier, monospace" },
]

function FontPresets({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1">
      <div className="flex flex-wrap gap-1">
        {FONT_PRESETS.map(p => (
          <button key={p.label} type="button" onClick={() => onChange(p.value)}
            className={cn("text-xs px-1.5 py-0.5 rounded border transition-colors",
              p.value === value ? "bg-primary text-primary-foreground border-primary" : "hover:bg-accent/50 border-gray-200")}>
            {p.label}
          </button>
        ))}
      </div>
      <Input value={value} placeholder="font-family or Google Fonts URL…" onChange={e => onChange(e.target.value)} className="text-xs h-7" />
    </div>
  )
}

// ─── RichTextEditor ───────────────────────────────────────────────────────────

function RichTextEditor({ initialContent, onChange, placeholder = "Write something..." }: {
  initialContent: string; onChange: (html: string) => void; placeholder?: string
}) {
  const editor = useEditor({
    extensions: [StarterKit, TiptapUnderline, TiptapPlaceholder.configure({ placeholder })],
    content: initialContent,
    editorProps: { attributes: { class: "lesson-rte min-h-[100px] p-3 focus:outline-none" } },
    onUpdate({ editor }) { onChange(editor.getHTML()) },
  })
  if (!editor) return null
  const tb = (active: boolean, fn: () => void, title: string, icon: React.ReactNode) => (
    <button type="button" title={title} onClick={fn}
      className={cn("p-1.5 rounded hover:bg-accent transition-colors", active && "bg-border")}>
      {icon}
    </button>
  )
  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="flex flex-wrap gap-0.5 p-1.5 border-b bg-muted/50">
        {tb(editor.isActive("heading", { level: 1 }), () => editor.chain().focus().toggleHeading({ level: 1 }).run(), "H1", <Heading1 className="h-3.5 w-3.5" />)}
        {tb(editor.isActive("heading", { level: 2 }), () => editor.chain().focus().toggleHeading({ level: 2 }).run(), "H2", <Heading2 className="h-3.5 w-3.5" />)}
        {tb(editor.isActive("heading", { level: 3 }), () => editor.chain().focus().toggleHeading({ level: 3 }).run(), "H3", <Heading3 className="h-3.5 w-3.5" />)}
        <div className="w-px bg-border mx-0.5" />
        {tb(editor.isActive("bold"),        () => editor.chain().focus().toggleBold().run(),          "Bold",          <Bold className="h-3.5 w-3.5" />)}
        {tb(editor.isActive("italic"),      () => editor.chain().focus().toggleItalic().run(),        "Italic",        <Italic className="h-3.5 w-3.5" />)}
        {tb(editor.isActive("underline"),   () => editor.chain().focus().toggleUnderline().run(),     "Underline",     <UnderlineIcon className="h-3.5 w-3.5" />)}
        {tb(editor.isActive("strike"),      () => editor.chain().focus().toggleStrike().run(),        "Strikethrough", <Strikethrough className="h-3.5 w-3.5" />)}
        <div className="w-px bg-border mx-0.5" />
        {tb(editor.isActive("bulletList"),  () => editor.chain().focus().toggleBulletList().run(),  "Bullet List",   <List className="h-3.5 w-3.5" />)}
        {tb(editor.isActive("orderedList"), () => editor.chain().focus().toggleOrderedList().run(), "Numbered List", <ListOrdered className="h-3.5 w-3.5" />)}
      </div>
      <EditorContent editor={editor} />
    </div>
  )
}

// ─── Inline Text Block ────────────────────────────────────────────────────────

const BASE_FONT_PRESETS = [
  { label: "Default",  value: "" },
  { label: "Sans",     value: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" },
  { label: "Serif",    value: "Georgia, 'Times New Roman', serif" },
  { label: "Mono",     value: "'Courier New', Courier, monospace" },
]

// Google Font presets for inline toolbar (show top ones)
const TOOLBAR_GOOGLE_FONTS = GOOGLE_FONTS.map(f => ({ label: f, value: `"${f}", sans-serif` }))

function InlineTextBlock({ block, onUpdate, siteStyles }: {
  block: { id: string; type: "text"; html: string; letterSpacing?: string; rotate?: number }
  onUpdate: (patch: Partial<PageBlock>) => void
  siteStyles?: SiteStyleConfig
}) {
  const [linkDialogOpen, setLinkDialogOpen] = useState(false)
  const [pendingLink, setPendingLink] = useState("")
  const [fontOpen, setFontOpen] = useState(false)
  const [fontSearch, setFontSearch] = useState("")
  const fontRef = useRef<HTMLDivElement>(null)
  const fontSearchRef = useRef<HTMLInputElement>(null)

  // Close font picker on outside click
  useEffect(() => {
    function h(e: MouseEvent) { if (fontRef.current && !fontRef.current.contains(e.target as Node)) setFontOpen(false) }
    if (fontOpen) document.addEventListener("mousedown", h)
    return () => document.removeEventListener("mousedown", h)
  }, [fontOpen])

  // Build font list: site fonts first, then base presets, then Google Fonts
  const siteFonts: { label: string; value: string }[] = []
  if (siteStyles?.headingFont) siteFonts.push({ label: "Site Heading", value: siteStyles.headingFont })
  if (siteStyles?.bodyFont) siteFonts.push({ label: "Site Body", value: siteStyles.bodyFont })
  const allFonts = [
    ...siteFonts,
    ...BASE_FONT_PRESETS.filter(p => !siteFonts.some(s => s.value === p.value)),
  ]

  // Load Google font when selected
  useEffect(() => {
    const gfontMatch = GOOGLE_FONTS.find(f => currentFont.includes(f))
    if (gfontMatch) loadGoogleFont(gfontMatch)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const editor = useEditor({
    extensions: [
      StarterKit,
      TiptapUnderline,
      TiptapTextStyle,
      TiptapFontFamily,
      TiptapColor,
      TiptapHighlight.configure({ multicolor: true }),
      TiptapTextAlign.configure({ types: ["heading", "paragraph"] }),
      TiptapPlaceholder.configure({ placeholder: "Type something…" }),
      TiptapLink.configure({ openOnClick: false, HTMLAttributes: { class: "underline text-blue-600 cursor-pointer" } }),
    ],
    content: block.html,
    editorProps: {
      attributes: {
        class: "min-h-full focus:outline-none cursor-text",
      },
    },
    onUpdate({ editor }) { onUpdate({ html: editor.getHTML() } as Partial<PageBlock>) },
  })

  function openLinkDialog() {
    if (!editor) return
    setPendingLink(editor.getAttributes("link").href ?? "")
    setLinkDialogOpen(true)
  }

  function applyLink() {
    if (!editor) return
    if (pendingLink) editor.chain().focus().extendMarkRange("link").setLink({ href: pendingLink }).run()
    else editor.chain().focus().unsetLink().run()
    setLinkDialogOpen(false)
  }

  const tb = (active: boolean, fn: () => void, title: string, icon: React.ReactNode) => (
    <button type="button" title={title} onMouseDown={e => { e.preventDefault(); fn() }}
      className={cn("p-2.5 rounded-none hover:bg-accent transition-colors", active && "bg-border")}>
      {icon}
    </button>
  )
  const sep = <div className="w-px h-6 bg-border mx-0.5 shrink-0" />

  const currentFont = (editor?.isActive("textStyle") ? editor.getAttributes("textStyle").fontFamily : "") ?? ""

  // Resolve a display label for the active font
  const activeFontLabel = (() => {
    if (!currentFont) return "Font"
    const preset = allFonts.find(f => f.value === currentFont)
    if (preset) return preset.label
    const gfont = GOOGLE_FONTS.find(f => currentFont.includes(f))
    if (gfont) return gfont
    // Fallback: first quoted name or first comma-segment
    const m = currentFont.match(/["']([^"']+)["']/) ?? currentFont.match(/^([^,]+)/)
    return m ? m[1].trim() : "Font"
  })()

  const containerStyle: React.CSSProperties = block.rotate ? { transform: `rotate(${block.rotate}deg)` } : {}

  return (
    <div className="h-full relative" style={containerStyle}>
      {/* Drag handle — absolute so it doesn't shift content */}
      <div className="rgl-drag-handle absolute top-0 left-0 right-0 h-3 z-10 cursor-move" />

      {/* Floating toolbar above block — fixed width, never wraps */}
      {editor && (
        <div className="absolute bottom-full left-0 mb-1 z-50 flex flex-nowrap items-center bg-card border shadow-lg min-h-[40px]">

          {/* Font family picker */}
          <div ref={fontRef} className="relative">
            <button type="button" title="Font"
              onMouseDown={e => { e.preventDefault(); setFontOpen(v => !v) }}
              className="flex items-center gap-1.5 px-3 h-10 text-xs hover:bg-accent transition-colors border-r">
              <Type className="h-4 w-4 shrink-0" />
              <span className="max-w-[88px] truncate font-medium">{activeFontLabel}</span>
            </button>
            {fontOpen && (
              <div className="absolute top-full left-0 mt-px bg-card border shadow-lg z-10 w-52">
                {/* Site + System presets */}
                {allFonts.map(f => (
                  <button key={f.value} type="button"
                    onMouseDown={e => { e.preventDefault(); f.value ? editor.chain().focus().setFontFamily(f.value).run() : editor.chain().focus().unsetFontFamily().run(); setFontOpen(false); setFontSearch("") }}
                    className={cn("w-full text-left px-3 py-1.5 text-sm hover:bg-accent/50 transition-colors", currentFont === f.value && "bg-muted font-medium")}
                    style={{ fontFamily: f.value || undefined }}>
                    {f.label}
                  </button>
                ))}
                {/* Google Fonts — with search */}
                <div className="border-t bg-muted/50 px-2 py-1.5 sticky top-0">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium mb-1">Google Fonts</p>
                  <input
                    ref={fontSearchRef}
                    type="text"
                    value={fontSearch}
                    onMouseDown={e => e.stopPropagation()}
                    onChange={e => setFontSearch(e.target.value)}
                    placeholder="Search…"
                    className="w-full text-xs px-2 py-1 border rounded bg-card focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div className="max-h-48 overflow-y-auto">
                  {TOOLBAR_GOOGLE_FONTS
                    .filter(f => !fontSearch || f.label.toLowerCase().includes(fontSearch.toLowerCase()))
                    .map(f => (
                      <button key={f.value} type="button"
                        onMouseDown={e => {
                          e.preventDefault()
                          loadGoogleFont(f.label)
                          editor.chain().focus().setFontFamily(f.value).run()
                          setFontOpen(false)
                          setFontSearch("")
                        }}
                        className={cn("w-full text-left px-3 py-1.5 text-sm hover:bg-accent/50 transition-colors", currentFont === f.value && "bg-muted font-medium")}
                        style={{ fontFamily: f.value }}>
                        {f.label}
                      </button>
                    ))}
                  {fontSearch && TOOLBAR_GOOGLE_FONTS.filter(f => f.label.toLowerCase().includes(fontSearch.toLowerCase())).length === 0 && (
                    <p className="px-3 py-2 text-xs text-muted-foreground">No fonts match</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {sep}

          {/* Headings */}
          {tb(editor.isActive("heading", { level: 1 }), () => editor.chain().focus().toggleHeading({ level: 1 }).run(), "H1", <Heading1 className="h-4 w-4" />)}
          {tb(editor.isActive("heading", { level: 2 }), () => editor.chain().focus().toggleHeading({ level: 2 }).run(), "H2", <Heading2 className="h-4 w-4" />)}
          {tb(editor.isActive("heading", { level: 3 }), () => editor.chain().focus().toggleHeading({ level: 3 }).run(), "H3", <Heading3 className="h-4 w-4" />)}

          {sep}

          {/* Formatting */}
          {tb(editor.isActive("bold"),      () => editor.chain().focus().toggleBold().run(),      "Bold",          <Bold className="h-4 w-4" />)}
          {tb(editor.isActive("italic"),    () => editor.chain().focus().toggleItalic().run(),    "Italic",        <Italic className="h-4 w-4" />)}
          {tb(editor.isActive("underline"), () => editor.chain().focus().toggleUnderline().run(), "Underline",     <UnderlineIcon className="h-4 w-4" />)}
          {tb(editor.isActive("strike"),    () => editor.chain().focus().toggleStrike().run(),    "Strikethrough", <Strikethrough className="h-4 w-4" />)}

          {sep}

          {/* Font color + clear */}
          <div className="flex items-center">
            <label title="Font Color" className="relative p-2.5 cursor-pointer hover:bg-accent transition-colors">
              <Type className="h-4 w-4" style={{ color: editor.getAttributes("textStyle").color ?? "currentColor" }} />
              <input type="color" className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                value={editor.getAttributes("textStyle").color ?? "#000000"}
                onMouseDown={e => e.stopPropagation()}
                onChange={e => editor.chain().focus().setColor(e.target.value).run()} />
            </label>
            {editor.getAttributes("textStyle").color && (
              <button type="button" title="Clear color" onMouseDown={e => { e.preventDefault(); editor.chain().focus().unsetColor().run() }}
                className="p-1.5 hover:bg-accent transition-colors text-gray-400 hover:text-gray-700 text-xs leading-none">✕</button>
            )}
          </div>

          {/* Highlight + clear */}
          <div className="flex items-center">
            <label title="Highlight" className="relative p-2.5 cursor-pointer hover:bg-accent transition-colors">
              <Highlighter className="h-4 w-4"
                style={{ color: editor.isActive("highlight") ? (editor.getAttributes("highlight").color ?? "#fef08a") : "currentColor" }} />
              <input type="color" className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                value={editor.getAttributes("highlight").color ?? "#fef08a"}
                onMouseDown={e => e.stopPropagation()}
                onChange={e => editor.chain().focus().setHighlight({ color: e.target.value }).run()} />
            </label>
            {editor.isActive("highlight") && (
              <button type="button" title="Remove highlight" onMouseDown={e => { e.preventDefault(); editor.chain().focus().unsetHighlight().run() }}
                className="p-1.5 hover:bg-accent transition-colors text-gray-400 hover:text-gray-700 text-xs leading-none">✕</button>
            )}
          </div>

          {sep}

          {/* Alignment */}
          {tb(editor.isActive({ textAlign: "left" }),    () => editor.chain().focus().setTextAlign("left").run(),    "Align Left",    <AlignLeft className="h-4 w-4" />)}
          {tb(editor.isActive({ textAlign: "center" }),  () => editor.chain().focus().setTextAlign("center").run(),  "Align Center",  <AlignCenter className="h-4 w-4" />)}
          {tb(editor.isActive({ textAlign: "right" }),   () => editor.chain().focus().setTextAlign("right").run(),   "Align Right",   <AlignRight className="h-4 w-4" />)}
          {tb(editor.isActive({ textAlign: "justify" }), () => editor.chain().focus().setTextAlign("justify").run(), "Justify",       <AlignJustify className="h-4 w-4" />)}

          {sep}

          {/* Lists */}
          {tb(editor.isActive("bulletList"),  () => editor.chain().focus().toggleBulletList().run(),  "Bullet List",   <List className="h-4 w-4" />)}
          {tb(editor.isActive("orderedList"), () => editor.chain().focus().toggleOrderedList().run(), "Numbered List", <ListOrdered className="h-4 w-4" />)}

          {sep}

          {/* Link */}
          {tb(editor.isActive("link"), openLinkDialog, "Link", <LinkIcon className="h-4 w-4" />)}
        </div>
      )}

      {/* Editable content — mirrors section.py-8.px-6.h-full > div.prose-content from PageBlockRenderer */}
      <div
        className="prose-content py-8 px-6 w-full h-full overflow-hidden"
        style={block.letterSpacing ? { letterSpacing: block.letterSpacing } : undefined}
      >
        <EditorContent editor={editor} className="w-full h-full [&_.ProseMirror]:min-h-full" />
      </div>

      {/* Link dialog */}
      {linkDialogOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30" onMouseDown={() => setLinkDialogOpen(false)}>
          <div className="bg-card rounded-xl shadow-2xl p-5 w-80 space-y-4" onMouseDown={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <span className="font-semibold text-sm">Insert Link</span>
              <button type="button" onClick={() => setLinkDialogOpen(false)} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
            </div>
            <LinkPicker value={pendingLink} onChange={setPendingLink} />
            <div className="flex justify-end gap-2">
              {editor?.isActive("link") && (
                <button type="button" onClick={() => { editor.chain().focus().unsetLink().run(); setLinkDialogOpen(false) }}
                  className="text-xs text-destructive hover:underline">Remove link</button>
              )}
              <button type="button" onClick={applyLink}
                className="text-xs px-3 py-1.5 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors">
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Alignment buttons ────────────────────────────────────────────────────────

function AlignButtons({ value, onChange }: { value: "left" | "center" | "right"; onChange: (v: "left" | "center" | "right") => void }) {
  return (
    <div className="flex border rounded-md overflow-hidden">
      {(["left", "center", "right"] as const).map((a) => (
        <button key={a} type="button" onClick={() => onChange(a)}
          className={cn("flex-1 flex items-center justify-center py-1.5 hover:bg-accent/50 transition-colors",
            value === a && "bg-primary text-primary-foreground hover:bg-primary")}>
          {a === "left" ? <AlignLeft className="h-3.5 w-3.5" /> : a === "center" ? <AlignCenter className="h-3.5 w-3.5" /> : <AlignRight className="h-3.5 w-3.5" />}
        </button>
      ))}
    </div>
  )
}

// ─── Color swatches ───────────────────────────────────────────────────────────

const HERO_COLORS = [
  { label: "Black",        value: "#111827" },
  { label: "Deep Blue",    value: "#1e3a5f" },
  { label: "Forest Green", value: "#14532d" },
  { label: "Burgundy",     value: "#7f1d1d" },
  { label: "Purple",       value: "#4c1d95" },
  { label: "Slate",        value: "#334155" },
  { label: "White",        value: "#ffffff" },
]

const SECTION_PRESETS = [
  { label: "White",      value: "#ffffff" },
  { label: "Off-white",  value: "#f9fafb" },
  { label: "Light gray", value: "#f3f4f6" },
  { label: "Stone",      value: "#f5f5f4" },
  { label: "Light blue", value: "#eff6ff" },
  { label: "Dark",       value: "#111827" },
]

function BgSwatches({ value, onChange, primaryColor }: {
  value: string | undefined
  onChange: (v: string | undefined) => void
  primaryColor?: string
}) {
  const presets = primaryColor
    ? [{ label: "Brand", value: primaryColor }, ...SECTION_PRESETS]
    : SECTION_PRESETS

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {presets.map((s) => (
          <button key={s.value} type="button" title={s.label}
            onClick={() => onChange(s.value)}
            className={cn("h-7 w-7 rounded-md border-2 transition-all shadow-sm",
              value === s.value ? "border-primary scale-110 ring-2 ring-primary/30" : "border-gray-200 hover:border-gray-400")}
            style={{ backgroundColor: s.value }}
          />
        ))}
        {/* Clear */}
        <button type="button" title="No color"
          onClick={() => onChange(undefined)}
          className={cn("h-7 w-7 rounded-md border-2 transition-all",
            !value ? "border-primary scale-110" : "border-gray-200 hover:border-gray-400")}
          style={{ backgroundImage: "repeating-linear-gradient(45deg,#ccc 0,#ccc 1px,transparent 0,transparent 50%)", backgroundSize: "6px 6px" }}
        />
      </div>
      <div className="flex gap-2 items-center">
        <input type="color" value={value ?? "#ffffff"}
          onChange={e => onChange(e.target.value)}
          className="h-7 w-9 rounded border cursor-pointer p-0.5 shrink-0" />
        <Input value={value ?? ""} placeholder="Custom hex…" className="h-7 text-xs"
          onChange={(e) => onChange(e.target.value || undefined)} />
      </div>
    </div>
  )
}

function SectionBgField({ value, onChange }: { value: string | undefined; onChange: (v: string | undefined) => void }) {
  return (
    <>
      <Separator />
      <div className="flex flex-col gap-1.5">
        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Section Background</Label>
        <BgSwatches value={value} onChange={onChange} />
      </div>
    </>
  )
}


// ─── Block Settings ───────────────────────────────────────────────────────────

function BlockSettings({ block, onUpdate }: { block: PageBlock; onUpdate: (p: Partial<PageBlock>) => void }) {
  const row = "flex flex-col gap-1.5"
  const lbl = "text-xs font-medium text-muted-foreground uppercase tracking-wide"

  return (
    <div className="space-y-4">
      {block.type === "hero" && (
        <>
          <div className={row}><Label className={lbl}>Heading</Label><Input value={block.heading} onChange={(e) => onUpdate({ heading: e.target.value } as Partial<PageBlock>)} /></div>
          <div className={row}><Label className={lbl}>Subtitle</Label><Textarea value={block.subtitle} rows={2} onChange={(e) => onUpdate({ subtitle: e.target.value } as Partial<PageBlock>)} /></div>
          <Separator />
          <div className={row}><Label className={lbl}>Primary CTA Text</Label><Input value={block.ctaText} onChange={(e) => onUpdate({ ctaText: e.target.value } as Partial<PageBlock>)} /></div>
          <div className={row}><LinkPicker value={block.ctaHref} onChange={v => onUpdate({ ctaHref: v } as Partial<PageBlock>)} label="Primary CTA Link" /></div>
          <div className={row}><Label className={lbl}>Secondary CTA Text</Label><Input value={block.secondaryCtaText} onChange={(e) => onUpdate({ secondaryCtaText: e.target.value } as Partial<PageBlock>)} /></div>
          <div className={row}><LinkPicker value={block.secondaryCtaHref} onChange={v => onUpdate({ secondaryCtaHref: v } as Partial<PageBlock>)} label="Secondary CTA Link" /></div>
          <Separator />
          <div className={row}><Label className={lbl}>Alignment</Label><AlignButtons value={block.align} onChange={(v) => onUpdate({ align: v } as Partial<PageBlock>)} /></div>
          <div className={row}>
            <Label className={lbl}>Background Color</Label>
            <div className="flex flex-wrap gap-1.5">
              {HERO_COLORS.map((c) => (
                <button key={c.value} type="button" title={c.label} onClick={() => onUpdate({ bgColor: c.value } as Partial<PageBlock>)}
                  className={cn("h-7 w-7 rounded-full border-2 transition-all", block.bgColor === c.value ? "border-primary scale-110" : "border-transparent")}
                  style={{ backgroundColor: c.value }} />
              ))}
            </div>
            <Input value={block.bgColor} placeholder="#111827" onChange={(e) => onUpdate({ bgColor: e.target.value } as Partial<PageBlock>)} />
          </div>
          <div className={row}><Label className={lbl}>Background Image URL</Label><Input value={block.bgImage} placeholder="https://..." onChange={(e) => onUpdate({ bgImage: e.target.value } as Partial<PageBlock>)} /></div>
          <div className={row}>
            <Label className={lbl}>Text Color</Label>
            <div className="flex gap-2">
              {(["light", "dark"] as const).map((tc) => (
                <button key={tc} type="button" onClick={() => onUpdate({ textColor: tc } as Partial<PageBlock>)}
                  className={cn("flex-1 py-1.5 text-xs rounded-md border transition-colors",
                    block.textColor === tc
                      ? tc === "light" ? "bg-gray-900 text-white border-gray-900" : "bg-muted text-gray-900 border-gray-400 font-semibold"
                      : "bg-card text-gray-700 hover:bg-accent/50")}>
                  {tc === "light" ? "Light text" : "Dark text"}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
      {block.type === "text" && (
        <>
          <div className={row}><Label className={lbl}>Content</Label>
            <RichTextEditor key={block.id} initialContent={block.html} onChange={(html) => onUpdate({ html } as Partial<PageBlock>)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className={row}>
              <Label className={lbl}>Kerning</Label>
              <Input
                value={block.letterSpacing ?? ""}
                placeholder="e.g. 0.05em"
                onChange={(e) => onUpdate({ letterSpacing: e.target.value || undefined } as Partial<PageBlock>)}
              />
            </div>
            <div className={row}>
              <Label className={lbl}>Rotation (°)</Label>
              <Input
                type="number"
                value={block.rotate ?? ""}
                placeholder="0"
                onChange={(e) => onUpdate({ rotate: e.target.value ? Number(e.target.value) : undefined } as Partial<PageBlock>)}
              />
            </div>
          </div>
          <SectionBgField value={block.sectionBg} onChange={(v) => onUpdate({ sectionBg: v } as Partial<PageBlock>)} />
        </>
      )}
      {block.type === "image" && (
        <>
          <div className={row}><Label className={lbl}>Image URL</Label><Input value={block.src} placeholder="https://..." onChange={(e) => onUpdate({ src: e.target.value } as Partial<PageBlock>)} /></div>
          <div className={row}><Label className={lbl}>Alt Text</Label><Input value={block.alt} placeholder="Describe the image" onChange={(e) => onUpdate({ alt: e.target.value } as Partial<PageBlock>)} /></div>
          <div className={row}><Label className={lbl}>Caption</Label><Input value={block.caption} onChange={(e) => onUpdate({ caption: e.target.value } as Partial<PageBlock>)} /></div>
          <div className={row}>
            <Label className={lbl}>Width</Label>
            <Select value={block.width} onValueChange={(v) => onUpdate({ width: v as "full"|"lg"|"md"|"sm" } as Partial<PageBlock>)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="full">Full width</SelectItem>
                <SelectItem value="lg">Large</SelectItem>
                <SelectItem value="md">Medium</SelectItem>
                <SelectItem value="sm">Small</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className={row}><Label className={lbl}>Alignment</Label><AlignButtons value={block.align} onChange={(v) => onUpdate({ align: v } as Partial<PageBlock>)} /></div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="img-rounded" checked={block.rounded} onChange={(e) => onUpdate({ rounded: e.target.checked } as Partial<PageBlock>)} className="rounded" />
            <label htmlFor="img-rounded" className="text-sm">Rounded corners</label>
          </div>
          <SectionBgField value={block.sectionBg} onChange={(v) => onUpdate({ sectionBg: v } as Partial<PageBlock>)} />
        </>
      )}
      {block.type === "video" && (
        <>
          <div className={row}><Label className={lbl}>Video URL (YouTube)</Label><Input value={block.url} placeholder="https://youtube.com/watch?v=..." onChange={(e) => onUpdate({ url: e.target.value } as Partial<PageBlock>)} /></div>
          <div className={row}><Label className={lbl}>Caption</Label><Input value={block.caption} onChange={(e) => onUpdate({ caption: e.target.value } as Partial<PageBlock>)} /></div>
          <SectionBgField value={block.sectionBg} onChange={(v) => onUpdate({ sectionBg: v } as Partial<PageBlock>)} />
        </>
      )}
      {block.type === "button" && (
        <>
          <div className={row}><Label className={lbl}>Button Text</Label><Input value={block.text} onChange={(e) => onUpdate({ text: e.target.value } as Partial<PageBlock>)} /></div>
          <div className={row}><LinkPicker value={block.href} onChange={v => onUpdate({ href: v } as Partial<PageBlock>)} label="Link" /></div>
          <div className={row}>
            <Label className={lbl}>Style</Label>
            <Select value={block.variant} onValueChange={(v) => onUpdate({ variant: v as "default"|"outline"|"secondary" } as Partial<PageBlock>)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Filled</SelectItem>
                <SelectItem value="outline">Outline</SelectItem>
                <SelectItem value="secondary">Secondary</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className={row}>
            <Label className={lbl}>Size</Label>
            <Select value={block.size} onValueChange={(v) => onUpdate({ size: v as "sm"|"default"|"lg" } as Partial<PageBlock>)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="sm">Small</SelectItem>
                <SelectItem value="default">Default</SelectItem>
                <SelectItem value="lg">Large</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className={row}><Label className={lbl}>Alignment</Label><AlignButtons value={block.align} onChange={(v) => onUpdate({ align: v } as Partial<PageBlock>)} /></div>
          <SectionBgField value={block.sectionBg} onChange={(v) => onUpdate({ sectionBg: v } as Partial<PageBlock>)} />
        </>
      )}
      {block.type === "spacer" && (
        <div className={row}>
          <Label className={lbl}>Height</Label>
          <Select value={block.size} onValueChange={(v) => onUpdate({ size: v as "xs"|"sm"|"md"|"lg"|"xl" } as Partial<PageBlock>)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="xs">Extra Small (16px)</SelectItem>
              <SelectItem value="sm">Small (32px)</SelectItem>
              <SelectItem value="md">Medium (64px)</SelectItem>
              <SelectItem value="lg">Large (96px)</SelectItem>
              <SelectItem value="xl">Extra Large (144px)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
      {block.type === "divider" && (
        <>
          <p className="text-sm text-muted-foreground">A horizontal divider line.</p>
          <SectionBgField value={block.sectionBg} onChange={(v) => onUpdate({ sectionBg: v } as Partial<PageBlock>)} />
        </>
      )}
      {block.type === "quote" && (
        <>
          <div className={row}><Label className={lbl}>Quote Text</Label><Textarea value={block.text} rows={3} onChange={(e) => onUpdate({ text: e.target.value } as Partial<PageBlock>)} /></div>
          <div className={row}><Label className={lbl}>Author</Label><Input value={block.author} placeholder="Author name (optional)" onChange={(e) => onUpdate({ author: e.target.value } as Partial<PageBlock>)} /></div>
          <SectionBgField value={block.sectionBg} onChange={(v) => onUpdate({ sectionBg: v } as Partial<PageBlock>)} />
        </>
      )}
      {block.type === "cards" && (
        <>
          <div className={row}>
            <Label className={lbl}>Columns</Label>
            <Select value={String(block.columns)} onValueChange={(v) => onUpdate({ columns: Number(v) as 2|3|4 } as Partial<PageBlock>)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="2">2 columns</SelectItem>
                <SelectItem value="3">3 columns</SelectItem>
                <SelectItem value="4">4 columns</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Separator />
          {block.cards.map((card, i) => (
            <div key={i} className="space-y-2 p-3 border rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Card {i + 1}</span>
                <button type="button" onClick={() => onUpdate({ cards: block.cards.filter((_, idx) => idx !== i) } as Partial<PageBlock>)} className="text-destructive text-xs">Remove</button>
              </div>
              <Input value={card.title} placeholder="Title" onChange={(e) => { const c = [...block.cards]; c[i] = { ...c[i], title: e.target.value }; onUpdate({ cards: c } as Partial<PageBlock>) }} />
              <Textarea value={card.description} placeholder="Description" rows={2} onChange={(e) => { const c = [...block.cards]; c[i] = { ...c[i], description: e.target.value }; onUpdate({ cards: c } as Partial<PageBlock>) }} />
              <Input value={card.icon} placeholder="Emoji icon" onChange={(e) => { const c = [...block.cards]; c[i] = { ...c[i], icon: e.target.value }; onUpdate({ cards: c } as Partial<PageBlock>) }} />
              <Input value={card.link} placeholder="Link URL" onChange={(e) => { const c = [...block.cards]; c[i] = { ...c[i], link: e.target.value }; onUpdate({ cards: c } as Partial<PageBlock>) }} />
              <Input value={card.linkText} placeholder="Link text" onChange={(e) => { const c = [...block.cards]; c[i] = { ...c[i], linkText: e.target.value }; onUpdate({ cards: c } as Partial<PageBlock>) }} />
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" className="w-full"
            onClick={() => onUpdate({ cards: [...block.cards, { title: "New Card", description: "A short description.", icon: "", link: "", linkText: "" }] } as Partial<PageBlock>)}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Add Card
          </Button>
          <SectionBgField value={block.sectionBg} onChange={(v) => onUpdate({ sectionBg: v } as Partial<PageBlock>)} />
        </>
      )}
      {block.type === "events" && (
        <>
          <div className={row}><Label className={lbl}>Heading</Label><Input value={block.heading} placeholder="Upcoming Events" onChange={(e) => onUpdate({ heading: e.target.value } as Partial<PageBlock>)} /></div>
          <div className={row}>
            <Label className={lbl}>Max Events (0 = all)</Label>
            <Input type="number" min={0} value={block.maxCount} onChange={(e) => onUpdate({ maxCount: Number(e.target.value) } as Partial<PageBlock>)} />
          </div>
          <div className={row}>
            <Label className={lbl}>Layout</Label>
            <Select value={block.layout} onValueChange={(v) => onUpdate({ layout: v as "list"|"grid" } as Partial<PageBlock>)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="list">List</SelectItem>
                <SelectItem value="grid">Grid</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <SectionBgField value={block.sectionBg} onChange={(v) => onUpdate({ sectionBg: v } as Partial<PageBlock>)} />
          <p className="text-xs text-muted-foreground">Displays upcoming published events from the backend.</p>
        </>
      )}
      {block.type === "give" && (
        <>
          <div className={row}><Label className={lbl}>Heading</Label><Input value={block.heading} placeholder="Give" onChange={(e) => onUpdate({ heading: e.target.value } as Partial<PageBlock>)} /></div>
          <div className={row}><Label className={lbl}>Description</Label><Textarea value={block.description} rows={2} placeholder="Support our ministry..." onChange={(e) => onUpdate({ description: e.target.value } as Partial<PageBlock>)} /></div>
          <SectionBgField value={block.sectionBg} onChange={(v) => onUpdate({ sectionBg: v } as Partial<PageBlock>)} />
          <p className="text-xs text-muted-foreground">Renders the Stripe giving form from the backend.</p>
        </>
      )}
    </div>
  )
}

// ─── Add Block popover ────────────────────────────────────────────────────────

const CONTENT_BLOCKS: { type: BlockType; label: string; icon: string }[] = [
  { type: "hero",   label: "Hero",   icon: "🦸" },
  { type: "text",   label: "Text",   icon: "📝" },
  { type: "image",  label: "Image",  icon: "🖼️" },
  { type: "video",  label: "Video",  icon: "📹" },
  { type: "button", label: "Button", icon: "🔘" },
  { type: "quote",  label: "Quote",  icon: '"'  },
  { type: "cards",  label: "Cards",  icon: "▦"  },
  { type: "events", label: "Events", icon: "📅"  },
  { type: "give",   label: "Give",   icon: "💝"  },
]
const LAYOUT_BLOCKS: { type: BlockType; label: string; icon: string }[] = [
  { type: "spacer",  label: "Spacer",  icon: "⠿" },
  { type: "divider", label: "Divider", icon: "—" },
]

function AddBlockPopover({ onAdd, iconOnly }: { onAdd: (type: BlockType) => void; iconOnly?: boolean }) {
  const [open, setOpen] = useState(false)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {iconOnly ? (
          <button type="button" title="Add block"
            className="h-7 w-7 flex items-center justify-center rounded-md bg-card shadow border border-gray-200 text-gray-700 hover:bg-accent/50 transition-colors">
            <Plus className="h-3.5 w-3.5" />
          </button>
        ) : (
          <button type="button"
            className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium">
            <Plus className="h-3 w-3" /> Add Block
          </button>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-52 p-2" align="start">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 px-1">Content</p>
        <div className="grid grid-cols-2 gap-0.5">
          {CONTENT_BLOCKS.map(({ type, label, icon }) => (
            <button key={type} type="button"
              onClick={() => { onAdd(type); setOpen(false) }}
              className="flex items-center gap-1.5 px-2 py-1.5 rounded text-sm hover:bg-accent text-left transition-colors">
              <span className="text-base leading-none">{icon}</span>{label}
            </button>
          ))}
        </div>
        <Separator className="my-1.5" />
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 px-1">Layout</p>
        <div className="grid grid-cols-2 gap-0.5">
          {LAYOUT_BLOCKS.map(({ type, label, icon }) => (
            <button key={type} type="button"
              onClick={() => { onAdd(type); setOpen(false) }}
              className="flex items-center gap-1.5 px-2 py-1.5 rounded text-sm hover:bg-accent text-left transition-colors">
              <span className="text-base leading-none">{icon}</span>{label}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}

// ─── Edit Section Sheet ───────────────────────────────────────────────────────

type SectionPatch = Omit<Partial<PageSection>, "id" | "blocks">

function EditSectionSheet({
  section,
  open,
  onClose,
  onUpdate,
  onMoveUp,
  onMoveDown,
  onDelete,
  canMoveUp,
  canMoveDown,
  primaryColor,
}: {
  section: PageSection
  open: boolean
  onClose: () => void
  onUpdate: (patch: SectionPatch) => void
  onMoveUp: () => void
  onMoveDown: () => void
  onDelete: () => void
  canMoveUp: boolean
  canMoveDown: boolean
  primaryColor?: string
}) {
  const imgRef = useRef<HTMLInputElement>(null)
  const vidRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState<"image" | "video" | null>(null)

  const lbl = "text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 block"

  async function uploadFile(file: File, kind: "image" | "video") {
    setUploading(kind)
    try {
      const fd = new FormData()
      fd.append("file", file)
      const res = await fetch("/api/uploads", { method: "POST", body: fd })
      if (!res.ok) { toast.error("Upload failed"); return }
      const { url } = await res.json()
      if (kind === "image") onUpdate({ bgImage: url })
      else onUpdate({ bgVideo: url })
    } catch {
      toast.error("Upload failed")
    } finally {
      setUploading(null)
    }
  }

  const rowH = section.rowHeight ?? 30
  const gap = section.gap ?? 0
  const cols = section.cols ?? 16
  const minH = section.minHeight ?? 0

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="w-96 overflow-y-auto">
        <SheetHeader className="mb-6 px-2">
          <SheetTitle className="flex items-center gap-2">
            <Layers className="h-4 w-4" /> Edit Section
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-8 px-2 pb-8">

          {/* ── Background color ── */}
          <div className="space-y-2">
            <p className={lbl}>Background Color</p>
            <BgSwatches value={section.bg} onChange={(v) => onUpdate({ bg: v })} primaryColor={primaryColor} />
          </div>

          <Separator />

          {/* ── Background image ── */}
          <div className="space-y-2">
            <p className={lbl}>Background Image</p>
            {section.bgImage && (
              <div className="relative rounded-md overflow-hidden h-24 bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={section.bgImage} alt="" className="w-full h-full object-cover" />
                <button type="button" onClick={() => onUpdate({ bgImage: undefined })}
                  className="absolute top-1 right-1 h-5 w-5 bg-black/60 text-white rounded-full flex items-center justify-center hover:bg-black transition-colors">
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
            <div className="flex gap-2">
              <Input value={section.bgImage ?? ""} placeholder="Image URL…"
                className="h-7 text-xs flex-1"
                onChange={e => onUpdate({ bgImage: e.target.value || undefined })} />
              <button type="button"
                onClick={() => imgRef.current?.click()}
                disabled={uploading === "image"}
                className="flex items-center gap-1 text-xs px-2 py-1 border rounded hover:bg-accent/50 transition-colors shrink-0 disabled:opacity-50">
                <Upload className="h-3 w-3" />
                {uploading === "image" ? "…" : "Upload"}
              </button>
            </div>
            <input ref={imgRef} type="file" accept="image/*" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) uploadFile(f, "image") }} />
          </div>

          <Separator />

          {/* ── Background video ── */}
          <div className="space-y-2">
            <p className={lbl}>Background Video</p>
            <p className="text-xs text-muted-foreground">YouTube link, direct video URL, or upload an MP4.</p>
            <div className="flex gap-1 items-center">
              <LinkIcon className="h-3 w-3 text-muted-foreground shrink-0" />
              <Input value={section.bgVideo ?? ""} placeholder="YouTube or video URL…"
                className="h-7 text-xs"
                onChange={e => onUpdate({ bgVideo: e.target.value || undefined })} />
              {section.bgVideo && (
                <button type="button" onClick={() => onUpdate({ bgVideo: undefined })}
                  className="h-6 w-6 flex items-center justify-center rounded hover:bg-accent text-muted-foreground shrink-0">
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
            <button type="button"
              onClick={() => vidRef.current?.click()}
              disabled={uploading === "video"}
              className="flex items-center gap-1.5 text-xs px-2 py-1.5 border rounded hover:bg-accent/50 transition-colors w-full justify-center disabled:opacity-50">
              <Upload className="h-3 w-3" />
              {uploading === "video" ? "Uploading…" : "Upload Video"}
            </button>
            <input ref={vidRef} type="file" accept="video/*" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) uploadFile(f, "video") }} />
          </div>

          {/* Overlay (only when image or video bg) */}
          {(section.bgImage || section.bgVideo) && (
            <>
              <div className="space-y-2">
                <p className={lbl}>Overlay</p>
                <p className="text-xs text-muted-foreground">Darken/lighten the background so text is readable.</p>
                <div className="flex items-center gap-2">
                  <input type="range" min={0} max={90} step={10}
                    value={section.bgOverlay ? parseInt(section.bgOverlay.match(/[\d.]+(?=\))/)?.[0] ?? "0") * 100 : 0}
                    onChange={e => {
                      const opacity = Number(e.target.value) / 100
                      onUpdate({ bgOverlay: opacity > 0 ? `rgba(0,0,0,${opacity})` : undefined })
                    }}
                    className="flex-1" />
                  <span className="text-xs text-muted-foreground w-8 text-right">
                    {section.bgOverlay ? Math.round(parseFloat(section.bgOverlay.match(/[\d.]+(?=\))/)?.[0] ?? "0") * 100) : 0}%
                  </span>
                </div>
              </div>
            </>
          )}

          <Separator />

          {/* ── Grid settings ── */}
          <div className="space-y-4">
            <p className={lbl}>Grid</p>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">Row height — {rowH}px</Label>
                <span className="text-xs text-muted-foreground">Grid precision</span>
              </div>
              <input type="range" min={15} max={80} step={5}
                value={rowH}
                onChange={e => onUpdate({ rowHeight: Number(e.target.value) })}
                className="w-full" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Fine (15px)</span><span>Coarse (80px)</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">Block spacing — {gap}px</Label>
              </div>
              <input type="range" min={0} max={40} step={4}
                value={gap}
                onChange={e => onUpdate({ gap: Number(e.target.value) })}
                className="w-full" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>None</span><span>40px</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">Grid columns — {cols}</Label>
              </div>
              <input type="range" min={2} max={20} step={1}
                value={cols}
                onChange={e => onUpdate({ cols: Number(e.target.value) })}
                className="w-full" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>2</span><span>20</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">Min height{minH > 0 ? ` — ${minH}px` : " — auto"}</Label>
              </div>
              <input type="range" min={0} max={1200} step={40}
                value={minH}
                onChange={e => onUpdate({ minHeight: Number(e.target.value) || undefined })}
                className="w-full" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Auto</span><span>1200px</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* ── Section actions ── */}
          <div className="space-y-2">
            <p className={lbl}>Section</p>
            <div className="flex gap-2">
              <button type="button" disabled={!canMoveUp} onClick={onMoveUp}
                className="flex-1 flex items-center justify-center gap-1 text-xs py-1.5 border rounded hover:bg-accent/50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                <ChevronUp className="h-3.5 w-3.5" /> Move Up
              </button>
              <button type="button" disabled={!canMoveDown} onClick={onMoveDown}
                className="flex-1 flex items-center justify-center gap-1 text-xs py-1.5 border rounded hover:bg-accent/50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                <ChevronDown className="h-3.5 w-3.5" /> Move Down
              </button>
            </div>
            <button type="button" onClick={() => { onDelete(); onClose() }}
              className="w-full flex items-center justify-center gap-1.5 text-xs py-1.5 border border-destructive text-destructive rounded hover:bg-destructive/5 transition-colors">
              <Trash2 className="h-3.5 w-3.5" /> Delete Section
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

// ─── Section canvas row ───────────────────────────────────────────────────────

interface SectionRowProps {
  section: PageSection
  sectionIndex: number
  totalSections: number
  canvasWidth: number
  selectedId: string | null
  onSelect: (id: string) => void
  onDeselect: () => void
  onEdit: (id: string) => void
  onUpdateBlock: (id: string, patch: Partial<PageBlock>) => void
  onDeleteBlock: (id: string) => void
  onDuplicateBlock: (id: string) => void
  onLayoutChange: (layout: Layout[]) => void
  onAddBlock: (type: BlockType) => void
  onUpdateSection: (patch: SectionPatch) => void
  onDuplicate: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  onDelete: () => void
  primaryColor?: string
  siteStyles?: SiteStyleConfig
  stylesOpen?: boolean
  onJumpStyle?: (section: string) => void
}

function SectionRow({
  section, sectionIndex, totalSections, canvasWidth,
  selectedId, onSelect, onDeselect, onEdit,
  onUpdateBlock, onDeleteBlock, onDuplicateBlock,
  onLayoutChange, onAddBlock,
  onUpdateSection, onDuplicate, onMoveUp, onMoveDown, onDelete,
  primaryColor, siteStyles, stylesOpen, onJumpStyle,
}: SectionRowProps) {
  const [sheetOpen, setSheetOpen] = useState(false)
  const sectionRef = useRef<HTMLDivElement>(null)
  const dragStartY = useRef<number>(0)
  const dragStartH = useRef<number>(0)
  const [draggingHeight, setDraggingHeight] = useState<number | null>(null)
  const [isDraggingBlock, setIsDraggingBlock] = useState(false)

  function startHeightDrag(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    const currentH = section.minHeight ?? sectionRef.current?.offsetHeight ?? 0
    dragStartY.current = e.clientY
    dragStartH.current = currentH
    setDraggingHeight(currentH)

    function onMove(ev: MouseEvent) {
      const delta = ev.clientY - dragStartY.current
      const next = Math.max(40, dragStartH.current + delta)
      setDraggingHeight(next)
    }
    function onUp(ev: MouseEvent) {
      const delta = ev.clientY - dragStartY.current
      const next = Math.max(40, dragStartH.current + delta)
      setDraggingHeight(null)
      onUpdateSection({ minHeight: next })
      document.removeEventListener("mousemove", onMove)
      document.removeEventListener("mouseup", onUp)
    }
    document.addEventListener("mousemove", onMove)
    document.addEventListener("mouseup", onUp)
  }

  const rowH = section.rowHeight ?? 30
  const gap = section.gap ?? 0
  const cols = section.cols ?? 16

  const gridLayout: Layout[] = section.blocks.map((b) => ({
    i: b.id, x: b.lx, y: b.ly, w: b.lw, h: b.lh, minW: 1, minH: 2,
    static: !!b.pinned,
  }))

  const sectionStyle: React.CSSProperties = {}
  if (section.bg) sectionStyle.backgroundColor = section.bg
  const effectiveMinH = draggingHeight ?? section.minHeight
  if (effectiveMinH) sectionStyle.minHeight = effectiveMinH
  if (section.bgImage) {
    sectionStyle.backgroundImage = `url(${section.bgImage})`
    sectionStyle.backgroundSize = "cover"
    sectionStyle.backgroundPosition = "center"
  }

  return (
    <>
      {/* Section container with group hover */}
      <div ref={sectionRef} className="relative group/sec border-b last:border-b-0" style={sectionStyle} onClick={onDeselect}>

        {/* Hover buttons — top-left corner */}
        <div className="absolute top-2 left-2 z-30 flex items-start gap-1 opacity-0 group-hover/sec:opacity-100 transition-opacity">
          {/* Left column: Edit Section, icon row, Delete — width set by Edit Section button */}
          <div className="flex flex-col items-stretch gap-1 w-max">
            {/* Row 1: Edit Section */}
            <button type="button" onClick={() => setSheetOpen(true)}
              className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-md bg-card shadow border border-gray-200 text-gray-700 hover:bg-accent/50 transition-colors font-medium">
              <Settings2 className="h-3 w-3" /> Edit Section
            </button>
            {/* Row 2: icon-only actions */}
            <div className="flex items-center justify-between">
              <button type="button" onClick={onDuplicate} title="Duplicate section"
                className="flex-1 h-7 flex items-center justify-center rounded-md bg-card shadow border border-gray-200 text-gray-700 hover:bg-accent/50 transition-colors">
                <Copy className="h-3.5 w-3.5" />
              </button>
              <button type="button" onClick={onMoveUp} disabled={sectionIndex === 0} title="Move up"
                className="flex-1 h-7 flex items-center justify-center rounded-md bg-card shadow border border-gray-200 text-gray-700 hover:bg-accent/50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                <ChevronUp className="h-3.5 w-3.5" />
              </button>
              <button type="button" onClick={onMoveDown} disabled={sectionIndex === totalSections - 1} title="Move down"
                className="flex-1 h-7 flex items-center justify-center rounded-md bg-card shadow border border-gray-200 text-gray-700 hover:bg-accent/50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
            </div>
            {/* Row 3: Delete */}
            <button type="button" onClick={onDelete} title="Delete section"
              className="w-full flex items-center justify-center gap-1.5 text-xs px-2 py-1 rounded-md bg-card shadow border border-red-200 text-red-500 hover:bg-red-50 transition-colors font-medium">
              <Trash2 className="h-3 w-3" /> Delete
            </button>
          </div>
          {/* Add Block — sits beside the column, aligned to top */}
          <AddBlockPopover onAdd={onAddBlock} />
        </div>

        {/* Section body */}
        {section.blocks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2.5">
            <p className="text-sm opacity-70">Empty section</p>
            <AddBlockPopover onAdd={onAddBlock} />
          </div>
        ) : canvasWidth > 0 ? (
          <>
            {/* Column grid overlay shown while dragging a block */}
            {isDraggingBlock && (
              <div className="absolute inset-0 z-0 pointer-events-none grid" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: gap > 0 ? gap : 0, padding: gap > 0 ? gap : 0 }}>
                {Array.from({ length: cols }).map((_, i) => (
                  <div key={i} className="h-full bg-blue-500/5 border-x border-blue-400/20" />
                ))}
              </div>
            )}
          <ReactGridLayout
            layout={gridLayout}
            cols={cols}
            rowHeight={rowH}
            width={canvasWidth}
            margin={gap > 0 ? [gap, gap] : [0, 0]}
            containerPadding={gap > 0 ? [gap, gap] : [0, 0]}
            compactType={null}
            allowOverlap
            onLayoutChange={onLayoutChange}
            onDragStart={() => setIsDraggingBlock(true)}
            onDragStop={() => setIsDraggingBlock(false)}
            draggableHandle=".rgl-drag-handle"
            isResizable={false}
            isDraggable
          >
            {section.blocks.map((block) => {
              const isInlineEditing = block.type === "text" && selectedId === block.id
              return (
                <div
                  key={block.id}
                  className={cn(
                    "relative h-full cursor-pointer rounded-none",
                    isInlineEditing ? "overflow-visible" : "overflow-hidden",
                    selectedId === block.id
                      ? "outline outline-2 outline-blue-500/70 outline-offset-0"
                      : "outline outline-1 outline-transparent hover:outline-gray-300 outline-offset-0"
                  )}
                  onClick={(e) => {
                    e.stopPropagation()
                    if (!isInlineEditing) {
                      onSelect(block.id)
                      if (stylesOpen && onJumpStyle) {
                        const styleSection = block.type === "text" ? "typography"
                          : (block.type === "button" || block.type === "hero") ? "colors"
                          : null
                        if (styleSection) onJumpStyle(styleSection)
                      }
                    }
                  }}
                >
                  {isInlineEditing ? (
                    <InlineTextBlock
                      key={block.id}
                      block={block as { id: string; type: "text"; html: string; letterSpacing?: string; rotate?: number }}
                      onUpdate={(patch) => onUpdateBlock(block.id, patch)}
                      siteStyles={siteStyles}
                    />
                  ) : (
                    <>
                      {!block.pinned && (
                        <div className="rgl-drag-handle absolute top-0 left-0 right-0 h-3 z-10 cursor-move" />
                      )}
                      {block.type === "text" ? (
                        <div
                          className="prose-content py-8 px-6 w-full h-full overflow-hidden pointer-events-none"
                          style={{
                            ...(block.sectionBg ? { backgroundColor: block.sectionBg } : {}),
                            ...(block.letterSpacing ? { letterSpacing: block.letterSpacing } : {}),
                            ...(block.rotate ? { transform: `rotate(${block.rotate}deg)` } : {}),
                          }}
                          dangerouslySetInnerHTML={{ __html: block.html }}
                        />
                      ) : (
                        <div className="pointer-events-none w-full h-full overflow-hidden">
                          <PageBlockRenderer blocks={[block]} />
                        </div>
                      )}
                    </>
                  )}

                  {block.pinned && !isInlineEditing && (
                    <div className="absolute top-1 left-1 z-10 pointer-events-none">
                      <Pin className="h-3 w-3 text-muted-foreground/50" />
                    </div>
                  )}

                  {selectedId === block.id && (
                    <div
                      className="absolute top-0 right-0 z-30 flex items-center gap-0.5 bg-card border-b border-l border-gray-200 px-1.5 py-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button type="button" title="Edit block settings" onClick={() => onEdit(block.id)}
                        className="h-5 w-5 flex items-center justify-center rounded hover:bg-accent transition-colors text-muted-foreground">
                        <Settings2 className="h-3 w-3" />
                      </button>
                      <button type="button"
                        title={block.pinned ? "Unpin" : "Pin in place"}
                        onClick={() => onUpdateBlock(block.id, { pinned: !block.pinned } as Partial<PageBlock>)}
                        className={cn("h-5 w-5 flex items-center justify-center rounded transition-colors",
                          block.pinned ? "text-blue-600 hover:bg-blue-50" : "text-muted-foreground hover:bg-accent")}>
                        {block.pinned ? <PinOff className="h-3 w-3" /> : <Pin className="h-3 w-3" />}
                      </button>
                      <button type="button" title="Duplicate" onClick={() => onDuplicateBlock(block.id)}
                        className="h-5 w-5 flex items-center justify-center rounded hover:bg-accent transition-colors text-muted-foreground">
                        <Copy className="h-3 w-3" />
                      </button>
                      <button type="button" title="Delete" onClick={() => onDeleteBlock(block.id)}
                        className="h-5 w-5 flex items-center justify-center rounded hover:bg-red-50 transition-colors text-destructive">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </ReactGridLayout>
          </>
        ) : null}

        {/* Height drag handle */}
        <div
          onMouseDown={startHeightDrag}
          className="absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize z-20 flex items-center justify-center opacity-0 group-hover/sec:opacity-100 transition-opacity"
        >
          <div className="w-12 h-1 rounded-full bg-gray-400/60" />
          {draggingHeight !== null && (
            <span className="absolute right-2 bottom-3 text-[10px] font-mono bg-black/70 text-white px-1.5 py-0.5 rounded pointer-events-none">
              {Math.round(draggingHeight)}px
            </span>
          )}
        </div>
      </div>

      {/* Edit Section Sheet */}
      <EditSectionSheet
        section={section}
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onUpdate={onUpdateSection}
        onMoveUp={onMoveUp}
        onMoveDown={onMoveDown}
        onDelete={onDelete}
        canMoveUp={sectionIndex > 0}
        canMoveDown={sectionIndex < totalSections - 1}
        primaryColor={primaryColor}
      />
    </>
  )
}

// ─── Nav Preview ─────────────────────────────────────────────────────────────

function NavPreview({
  config,
  onEditNav,
}: {
  config: NavConfigData
  onEditNav: () => void
}) {
  const tree = buildPublicNavFromTree(config.navTree ?? [], new Map())
  const bg = config.colorMode === "static" ? config.staticBg : config.adaptiveLightBg
  const text = config.colorMode === "static" ? config.staticText : config.adaptiveLightText
  const borderStyle = config.border.show
    ? `${config.border.width}px ${config.border.style} ${config.border.color}`
    : undefined
  const shadow = navBoxShadow(config.shadow)

  return (
    <div
      className="relative group/nav shrink-0"
      style={{ height: config.height, backgroundColor: bg, borderBottom: borderStyle, boxShadow: shadow }}
    >
      <div className="h-full max-w-full px-6 flex items-center justify-between">
        <span className="font-bold text-sm" style={{ color: text }}>Logo</span>
        <nav className="flex items-center" style={{ gap: config.linkSpacing }}>
          {tree.map(item => (
            <div key={item.id} className="relative group/item">
              <span className="text-sm cursor-default" style={{ color: text }}>
                {item.label}
                {item.children.length > 0 && <span className="ml-1 opacity-60 text-xs">▾</span>}
              </span>
              {item.children.length > 0 && (
                <div className="absolute top-full left-0 mt-1 bg-card border rounded-lg shadow-lg py-1 min-w-[140px] opacity-0 group-hover/item:opacity-100 transition-opacity z-10 pointer-events-none">
                  {item.children.map(child => (
                    <div key={child.id} className="px-4 py-2 text-sm text-gray-700 whitespace-nowrap">{child.label}</div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>
      </div>

      {/* Edit Nav hover button */}
      <div className="absolute top-2 left-2 opacity-0 group-hover/nav:opacity-100 transition-opacity z-20">
        <button
          type="button"
          onClick={onEditNav}
          className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-md bg-card shadow border border-gray-200 text-gray-700 hover:bg-accent/50 transition-colors font-medium"
        >
          <Settings2 className="h-3 w-3" /> Edit Navigation
        </button>
      </div>
    </div>
  )
}

// ─── Preview modes ────────────────────────────────────────────────────────────

const PREVIEW_MODES: { mode: PreviewMode; icon: React.ReactNode; label: string }[] = [
  { mode: "desktop", icon: <Monitor className="h-3.5 w-3.5" />,    label: "Desktop" },
  { mode: "tablet",  icon: <Tablet className="h-3.5 w-3.5" />,     label: "Tablet"  },
  { mode: "mobile",  icon: <Smartphone className="h-3.5 w-3.5" />, label: "Mobile"  },
]

const STYLE_LBL = "text-xs font-medium text-muted-foreground uppercase tracking-wide"

// ─── Style panel helpers ──────────────────────────────────────────────────────

function StyleSection({
  title, sectionKey, open, setOpen, sectionRef, children,
}: {
  title: string
  sectionKey: string
  open: Record<string, boolean>
  setOpen: React.Dispatch<React.SetStateAction<Record<string, boolean>>>
  sectionRef: (el: HTMLDivElement | null) => void
  children: React.ReactNode
}) {
  const isOpen = open[sectionKey] ?? false
  return (
    <div ref={sectionRef} className="py-2">
      <button type="button"
        onClick={() => setOpen(prev => ({ ...prev, [sectionKey]: !prev[sectionKey] }))}
        className="flex items-center gap-1.5 w-full text-left mb-2 group">
        {isOpen
          ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground group-hover:text-foreground transition-colors">{title}</span>
      </button>
      {isOpen && <div className="space-y-3">{children}</div>}
    </div>
  )
}

const SYSTEM_FONT_PRESETS_PANEL = [
  { label: "System", value: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" },
  { label: "Serif",  value: "Georgia, 'Times New Roman', serif" },
  { label: "Mono",   value: "'Courier New', Courier, monospace" },
]

function PanelFontPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [showGfonts, setShowGfonts] = useState(false)
  const [gfontSearch, setGfontSearch] = useState("")
  const selectedGfont = GOOGLE_FONTS.find(f => value.includes(f)) ?? null
  const filteredGFonts = gfontSearch
    ? GOOGLE_FONTS.filter(f => f.toLowerCase().includes(gfontSearch.toLowerCase()))
    : GOOGLE_FONTS

  useEffect(() => {
    if (selectedGfont) loadGoogleFont(selectedGfont)
  }, [selectedGfont])

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap gap-1">
        <button type="button" onClick={() => onChange("")}
          className={cn("text-xs px-1.5 py-0.5 rounded border transition-colors",
            value === "" ? "bg-primary text-primary-foreground border-primary" : "hover:bg-accent/50 border-gray-200")}>
          Default
        </button>
        {SYSTEM_FONT_PRESETS_PANEL.map(p => (
          <button key={p.label} type="button" onClick={() => onChange(p.value)}
            className={cn("text-xs px-1.5 py-0.5 rounded border transition-colors",
              p.value === value ? "bg-primary text-primary-foreground border-primary" : "hover:bg-accent/50 border-gray-200")}>
            {p.label}
          </button>
        ))}
        <button type="button" onClick={() => setShowGfonts(v => !v)}
          className={cn("text-xs px-1.5 py-0.5 rounded border transition-colors",
            selectedGfont ? "bg-primary text-primary-foreground border-primary" : showGfonts ? "bg-muted border-gray-400" : "hover:bg-accent/50 border-gray-200")}>
          {selectedGfont ?? "Google…"}
        </button>
      </div>
      {showGfonts && (
        <div className="border rounded bg-muted/50 p-1.5 space-y-1.5">
          <Input
            value={gfontSearch}
            onChange={e => setGfontSearch(e.target.value)}
            placeholder="Search Google Fonts…"
            className="h-6 text-xs"
            autoFocus
          />
          <div className="flex flex-wrap gap-1 max-h-28 overflow-y-auto">
            {filteredGFonts.map(f => (
              <button key={f} type="button"
                onClick={() => { loadGoogleFont(f); onChange(`"${f}", sans-serif`); setShowGfonts(false); setGfontSearch("") }}
                className={cn("text-xs px-1.5 py-0.5 rounded border transition-colors",
                  selectedGfont === f ? "bg-primary text-primary-foreground border-primary" : "bg-card hover:bg-accent border-gray-200")}
                style={{ fontFamily: `"${f}", sans-serif` }}>
                {f}
              </button>
            ))}
            {filteredGFonts.length === 0 && <p className="text-xs text-muted-foreground px-1">No fonts match</p>}
          </div>
        </div>
      )}
      <Input value={value} placeholder="Custom font-family…" className="h-7 text-xs"
        onChange={e => onChange(e.target.value)} />
    </div>
  )
}

// ─── Main PageBuilder ─────────────────────────────────────────────────────────

export default function PageBuilder({ initialSections, initialTitle, initialSlug, initialPublished, initialNavLabel = "" }: PageBuilderProps) {
  const router = useRouter()

  const [sections, setSections] = useState<PageSection[]>(initialSections)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [title, setTitle] = useState(initialTitle)
  const [navLabel, setNavLabel] = useState(initialNavLabel)
  const [published, setPublished] = useState(initialPublished)
  const [saving, setSaving] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const [previewMode, setPreviewMode] = useState<PreviewMode>("desktop")
  const [editMode, setEditMode] = useState(true)
  const [pageSettingsOpen, setPageSettingsOpen] = useState(false)

  // Site styles
  const [siteStyles, setSiteStyles] = useState<SiteStyleConfig>({})
  const [stylesDirty, setStylesDirty] = useState(false)
  const [stylesSaving, setStylesSaving] = useState(false)
  const [stylesOpen, setStylesOpen] = useState(false)
  const [openStyleSections, setOpenStyleSections] = useState<Record<string, boolean>>({
    typography: true, colors: true, typescale: false, navigation: false,
  })
  const [jumpSection, setJumpSection] = useState<string | null>(null)
  const stylesPanelRef = useRef<HTMLDivElement>(null)
  const styleSectionRefs = useRef<Record<string, HTMLDivElement | null>>({})

  // Nav config (for preview)
  const [navConfig, setNavConfig] = useState<NavConfigData>(DEFAULT_NAV_CONFIG)
  const [navSaving, setNavSaving] = useState(false)

  useEffect(() => {
    fetch("/api/site-styles")
      .then(r => r.json())
      .then(data => setSiteStyles(parseSiteStyles(data.styles ?? "{}")))
      .catch(() => {})
    fetch("/api/nav-config")
      .then(r => r.json())
      .then(data => setNavConfig(parseNavConfig(data.config ?? "{}")))
      .catch(() => {})
  }, [])

  // Jump to a style section when triggered
  useEffect(() => {
    if (!jumpSection || !stylesOpen) return
    setOpenStyleSections(prev => ({ ...prev, [jumpSection]: true }))
    setTimeout(() => {
      styleSectionRefs.current[jumpSection]?.scrollIntoView({ behavior: "smooth", block: "start" })
    }, 50)
    setJumpSection(null)
  }, [jumpSection, stylesOpen])

  async function saveNavConfig() {
    setNavSaving(true)
    try {
      const res = await fetch("/api/nav-config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config: navConfig }),
      })
      if (!res.ok) { toast.error("Failed to save nav style"); return }
      toast.success("Nav style saved")
    } catch {
      toast.error("Failed to save nav style")
    } finally {
      setNavSaving(false)
    }
  }

  function openStylesAt(section: string) {
    setStylesOpen(true)
    setJumpSection(section)
  }

  async function saveSiteStyles() {
    setStylesSaving(true)
    try {
      const res = await fetch("/api/site-styles", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ styles: siteStyles }),
      })
      if (!res.ok) { toast.error("Failed to save styles"); return }
      toast.success("Site styles saved")
      setStylesDirty(false)
    } catch {
      toast.error("Failed to save styles")
    } finally {
      setStylesSaving(false)
    }
  }

  function setStyle(k: keyof SiteStyleConfig, v: string) {
    setSiteStyles(prev => ({ ...prev, [k]: v || undefined }))
    setStylesDirty(true)
  }

  // Canvas width
  const canvasRef = useRef<HTMLDivElement>(null)
  const [canvasWidth, setCanvasWidth] = useState(900)
  useEffect(() => {
    const el = canvasRef.current
    if (!el) return
    setCanvasWidth(el.offsetWidth)
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width
      if (w) setCanvasWidth(w)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [previewMode]) // re-run when preview mode changes

  const editingBlock = sections.flatMap(s => s.blocks).find(b => b.id === editingId) ?? null

  // ── Section operations ───────────────────────────────────────────────────

  function addSection() {
    const id = `section-${Date.now()}`
    setSections(prev => [...prev, { id, blocks: [] }])
    setIsDirty(true)
  }

  function deleteSection(sectionId: string) {
    setSections(prev => prev.filter(s => s.id !== sectionId))
    setIsDirty(true)
  }

  function duplicateSection(sectionId: string) {
    setSections(prev => {
      const idx = prev.findIndex(s => s.id === sectionId)
      if (idx < 0) return prev
      const src = prev[idx]
      const copy: PageSection = {
        ...src,
        id: `section-${Date.now()}`,
        blocks: src.blocks.map(b => ({
          ...b,
          id: `${b.id}-dup-${Math.random().toString(36).slice(2, 6)}`,
        })),
      }
      const next = [...prev]
      next.splice(idx + 1, 0, copy)
      return next
    })
    setIsDirty(true)
  }

  function updateSection(sectionId: string, patch: SectionPatch) {
    setSections(prev => prev.map(s => s.id === sectionId ? { ...s, ...patch } : s))
    setIsDirty(true)
  }

  function moveSectionUp(sectionId: string) {
    setSections(prev => {
      const idx = prev.findIndex(s => s.id === sectionId)
      if (idx <= 0) return prev
      const next = [...prev];
      [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]]
      return next
    })
    setIsDirty(true)
  }

  function moveSectionDown(sectionId: string) {
    setSections(prev => {
      const idx = prev.findIndex(s => s.id === sectionId)
      if (idx < 0 || idx >= prev.length - 1) return prev
      const next = [...prev];
      [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]]
      return next
    })
    setIsDirty(true)
  }

  // ── Block operations ─────────────────────────────────────────────────────

  const addBlock = useCallback((type: BlockType, sectionId: string) => {
    setSections(prev => prev.map(s => {
      if (s.id !== sectionId) return s
      const maxBottom = s.blocks.reduce((m, b) => Math.max(m, b.ly + b.lh), 0)
      const id = `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`
      return { ...s, blocks: [...s.blocks, defaultBlock(type, id, maxBottom)] }
    }))
    setIsDirty(true)
  }, [])

  const updateBlock = useCallback((blockId: string, patch: Partial<PageBlock>) => {
    setSections(prev => prev.map(s => ({
      ...s, blocks: s.blocks.map(b => b.id === blockId ? ({ ...b, ...patch } as PageBlock) : b),
    })))
    setIsDirty(true)
  }, [])

  const deleteBlock = useCallback((blockId: string) => {
    setSections(prev => prev.map(s => ({ ...s, blocks: s.blocks.filter(b => b.id !== blockId) })))
    setSelectedId(prev => prev === blockId ? null : prev)
    if (editingId === blockId) setEditingId(null)
    setIsDirty(true)
  }, [editingId])

  const duplicateBlock = useCallback((blockId: string) => {
    setSections(prev => prev.map(s => {
      const src = s.blocks.find(b => b.id === blockId)
      if (!src) return s
      const copy = { ...src, id: `dup-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, ly: src.ly + src.lh } as PageBlock
      return { ...s, blocks: [...s.blocks, copy] }
    }))
    setIsDirty(true)
  }, [])

  function handleLayoutChange(sectionId: string, newLayout: Layout[]) {
    let didChange = false
    setSections(prev => {
      const section = prev.find(s => s.id === sectionId)
      if (!section) return prev
      let changed = false
      const updatedBlocks = section.blocks.map(b => {
        const l = newLayout.find(item => item.i === b.id)
        if (!l) return b
        if (l.x !== b.lx || l.y !== b.ly || l.w !== b.lw || l.h !== b.lh) {
          changed = true
          return { ...b, lx: l.x, ly: l.y, lw: l.w, lh: l.h }
        }
        return b
      })
      if (!changed) return prev
      didChange = true
      return prev.map(s => s.id !== sectionId ? s : { ...s, blocks: updatedBlocks })
    })
    if (didChange) setIsDirty(true)
  }

  async function save() {
    setSaving(true)
    try {
      const res = await fetch(`/api/pages/${initialSlug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content: JSON.stringify({ sections }), published, navLabel: navLabel || null }),
      })
      if (!res.ok) { toast.error("Failed to save page"); return }
      toast.success("Page saved")
      setIsDirty(false)
      router.refresh()
    } catch {
      toast.error("Failed to save page")
    } finally {
      setSaving(false)
    }
  }

  const maxWidth = PREVIEW_WIDTH[previewMode]
  const cssvars = siteStylesCss(siteStyles)

  return (
    <div className="flex flex-col h-screen -m-6 overflow-hidden">

      {/* ── Top bar ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-b bg-card shrink-0">
        <Link href="/mychurch/pages" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors shrink-0">
          <ArrowLeft className="h-4 w-4" /> Pages
        </Link>
        <div className="w-px h-4 bg-border" />
        <input
          className="flex-1 font-semibold text-base bg-transparent focus:outline-none min-w-0"
          value={title}
          onChange={(e) => { setTitle(e.target.value); setIsDirty(true) }}
          placeholder="Page title"
        />
        <span className="text-xs text-muted-foreground shrink-0 hidden sm:block">/{initialSlug}</span>

        {/* Preview mode toggles (only visible in preview/edit mode) */}
        <div className="hidden sm:flex items-center border rounded-md overflow-hidden shrink-0">
          {PREVIEW_MODES.map(({ mode, icon, label }) => (
            <button key={mode} type="button" title={label} onClick={() => setPreviewMode(mode)}
              className={cn("h-7 w-7 flex items-center justify-center transition-colors",
                previewMode === mode ? "bg-primary text-primary-foreground" : "hover:bg-accent/50 text-muted-foreground")}>
              {icon}
            </button>
          ))}
        </div>

        {/* Edit / Preview toggle */}
        <button type="button"
          onClick={() => setEditMode(v => !v)}
          className={cn(
            "flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md border font-medium transition-colors shrink-0",
            editMode
              ? "bg-gray-900 text-white border-gray-900 hover:bg-gray-700"
              : "bg-card text-gray-700 border-gray-300 hover:bg-accent/50"
          )}
        >
          {editMode
            ? <><Eye className="h-3.5 w-3.5" /> Preview</>
            : <><Pencil className="h-3.5 w-3.5" /> Edit</>}
        </button>

        <button type="button" onClick={() => { setPublished(v => !v); setIsDirty(true) }} className="shrink-0">
          <Badge variant={published ? "default" : "secondary"} className="cursor-pointer">
            {published ? "Live" : "Draft"}
          </Badge>
        </button>
        {isDirty && <span className="text-xs text-muted-foreground shrink-0 hidden sm:block">Unsaved</span>}

        {/* Page settings */}
        <button
          type="button"
          title="Page Settings"
          onClick={() => setPageSettingsOpen(true)}
          className="h-8 w-8 flex items-center justify-center rounded-md border bg-card border-gray-200 text-muted-foreground hover:bg-accent/50 transition-colors shrink-0"
        >
          <Settings2 className="h-4 w-4" />
        </button>

        {/* Site Styles palette button */}
        <button
          type="button"
          title="Site Styles"
          onClick={() => setStylesOpen(v => !v)}
          className={cn(
            "h-8 w-8 flex items-center justify-center rounded-md border transition-colors shrink-0",
            stylesOpen ? "bg-primary text-primary-foreground border-primary" : "bg-card border-gray-200 text-muted-foreground hover:bg-accent/50"
          )}
        >
          <Palette className="h-4 w-4" />
        </button>

        <Button size="sm" onClick={save} disabled={saving} className="shrink-0">
          {saving ? "Saving..." : "Save"}
        </Button>
      </div>

      {/* ── Main area ────────────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Canvas ─────────────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-auto bg-muted">
          <div
            ref={canvasRef}
            className={cn("mx-auto bg-card shadow-sm transition-all duration-200 min-h-full")}
            style={maxWidth ? { maxWidth } : undefined}
          >
            {/* Site style CSS vars injected into preview */}
            {cssvars && <style dangerouslySetInnerHTML={{ __html: cssvars }} />}

            {/* Nav preview */}
            <NavPreview
              config={navConfig}
              onEditNav={() => openStylesAt("navigation")}
            />

            {!editMode ? (
              /* ── Preview mode — intercept links, stay in editor ── */
              <div
                onClick={(e) => {
                  const anchor = (e.target as HTMLElement).closest("a")
                  if (!anchor) return
                  const href = anchor.getAttribute("href")
                  if (!href) return
                  // Let external links open normally
                  if (href.startsWith("http") || href.startsWith("mailto") || href.startsWith("tel")) return
                  e.preventDefault()
                  // Map public route → admin page editor
                  // /about → /mychurch/pages/about, / → /mychurch/pages/home
                  const slug = href.replace(/^\//, "").split("?")[0] || "home"
                  router.push(`/mychurch/pages/${slug}`)
                }}
              >
                <PageBlockRenderer sections={sections} />
              </div>
            ) : (
              /* ── Edit mode ── */
              <>
                {sections.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-32 text-center text-muted-foreground">
                    <div className="text-4xl mb-4">✦</div>
                    <p className="font-medium text-lg">Start building your page</p>
                    <p className="text-sm mt-1 mb-6 max-w-xs">Add a section, then drop blocks inside to build your layout</p>
                    <Button variant="outline" onClick={addSection}>
                      <Plus className="h-4 w-4 mr-1.5" /> Add First Section
                    </Button>
                  </div>
                ) : (
                  <>
                    {sections.map((section, idx) => (
                      <SectionRow
                        key={section.id}
                        section={section}
                        sectionIndex={idx}
                        totalSections={sections.length}
                        canvasWidth={canvasWidth}
                        selectedId={selectedId}
                        onSelect={setSelectedId}
                        onDeselect={() => setSelectedId(null)}
                        onEdit={setEditingId}
                        onUpdateBlock={updateBlock}
                        onDeleteBlock={deleteBlock}
                        onDuplicateBlock={duplicateBlock}
                        onLayoutChange={(layout) => handleLayoutChange(section.id, layout)}
                        onAddBlock={(type) => addBlock(type, section.id)}
                        onUpdateSection={(patch) => updateSection(section.id, patch)}
                        onDuplicate={() => duplicateSection(section.id)}
                        onMoveUp={() => moveSectionUp(section.id)}
                        onMoveDown={() => moveSectionDown(section.id)}
                        onDelete={() => deleteSection(section.id)}
                        primaryColor={siteStyles.primaryColor}
                        siteStyles={siteStyles}
                        stylesOpen={stylesOpen}
                        onJumpStyle={setJumpSection}
                      />
                    ))}

                    {/* Add section */}
                    <div className="flex justify-center py-6">
                      <button type="button" onClick={addSection}
                        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground border border-dashed border-gray-300 hover:border-gray-400 rounded-lg px-5 py-2.5 transition-colors">
                        <Plus className="h-4 w-4" /> Add Section
                      </button>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>

      </div>

      {/* ── Site Styles floating panel ──────────────────────────────────────── */}
      {stylesOpen && (
        <div ref={stylesPanelRef} className="fixed top-[57px] right-4 z-50 w-80 bg-card border rounded-xl shadow-xl flex flex-col max-h-[calc(100vh-70px)]">
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2.5 border-b shrink-0">
            <span className="text-sm font-semibold">Site Styles</span>
            <button type="button" onClick={() => setStylesOpen(false)} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Scrollable body */}
          <div className="overflow-y-auto flex-1 px-3 py-3 space-y-0 text-sm">

            {/* ── Typography ── */}
            <StyleSection
              title="Typography"
              sectionKey="typography"
              open={openStyleSections}
              setOpen={setOpenStyleSections}
              sectionRef={(el) => { styleSectionRefs.current["typography"] = el }}
            >
              <div className="space-y-1.5">
                <Label className={STYLE_LBL}>Heading Font</Label>
                <PanelFontPicker value={siteStyles.headingFont ?? ""} onChange={v => setStyle("headingFont", v)} />
              </div>
              <div className="space-y-1.5">
                <Label className={STYLE_LBL}>Body Font</Label>
                <PanelFontPicker value={siteStyles.bodyFont ?? ""} onChange={v => setStyle("bodyFont", v)} />
              </div>
            </StyleSection>

            <Separator className="my-1" />

            {/* ── Colors ── */}
            <StyleSection
              title="Colors"
              sectionKey="colors"
              open={openStyleSections}
              setOpen={setOpenStyleSections}
              sectionRef={(el) => { styleSectionRefs.current["colors"] = el }}
            >
              {(["primaryColor", "secondaryColor", "tertiaryColor"] as const).map(key => (
                <div key={key} className="space-y-1">
                  <Label className={STYLE_LBL}>{key === "primaryColor" ? "Primary" : key === "secondaryColor" ? "Secondary" : "Tertiary"} Color</Label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={siteStyles[key] ?? "#111827"}
                      onChange={e => setStyle(key, e.target.value)}
                      className="h-7 w-10 rounded border cursor-pointer p-0.5 shrink-0" />
                    <Input value={siteStyles[key] ?? ""} placeholder="#111827" className="h-7 text-xs"
                      onChange={e => setStyle(key, e.target.value)} />
                  </div>
                </div>
              ))}
            </StyleSection>

            <Separator className="my-1" />

            {/* ── Type Scale ── */}
            <StyleSection
              title="Type Scale"
              sectionKey="typescale"
              open={openStyleSections}
              setOpen={setOpenStyleSections}
              sectionRef={(el) => { styleSectionRefs.current["typescale"] = el }}
            >
              <div className="grid grid-cols-2 gap-2">
                {([
                  ["H1 Size", "h1Size", "2rem"], ["H1 Weight", "h1Weight", "700"],
                  ["H2 Size", "h2Size", "1.5rem"], ["H2 Weight", "h2Weight", "600"],
                  ["H3 Size", "h3Size", "1.25rem"], ["H3 Weight", "h3Weight", "600"],
                  ["Body Size", "bodySize", "1rem"], ["Line Height", "bodyLineHeight", "1.7"],
                ] as [string, keyof SiteStyleConfig, string][]).map(([label, key, placeholder]) => (
                  <div key={key} className="space-y-1">
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <Input value={siteStyles[key] ?? ""} placeholder={placeholder} className="h-7 text-xs"
                      onChange={e => setStyle(key, e.target.value)} />
                  </div>
                ))}
              </div>
            </StyleSection>

            <Separator className="my-1" />

            {/* ── Navigation ── */}
            <StyleSection
              title="Navigation"
              sectionKey="navigation"
              open={openStyleSections}
              setOpen={setOpenStyleSections}
              sectionRef={(el) => { styleSectionRefs.current["navigation"] = el }}
            >
              <NavStylesBody config={navConfig} onChange={setNavConfig} />
              <div className="pt-2">
                <Button size="sm" className="w-full" onClick={saveNavConfig} disabled={navSaving}>
                  {navSaving ? "Saving…" : "Save Navigation Styles"}
                </Button>
              </div>
            </StyleSection>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2 px-3 py-2.5 border-t shrink-0">
            <Button variant="outline" size="sm" onClick={() => setStylesOpen(false)}>Close</Button>
            <Button size="sm" onClick={async () => { await saveSiteStyles() }} disabled={stylesSaving || !stylesDirty}>
              {stylesSaving ? "Saving…" : stylesDirty ? "Save Styles" : "Saved"}
            </Button>
          </div>
        </div>
      )}

      {/* ── Page settings sheet ───────────────────────────────────────────── */}
      <Sheet open={pageSettingsOpen} onOpenChange={setPageSettingsOpen}>
        <SheetContent side="right" className="w-80">
          <SheetHeader>
            <SheetTitle>Page Settings</SheetTitle>
          </SheetHeader>
          <div className="space-y-5 px-1 pt-4">
            <div className="space-y-1.5">
              <Label className={STYLE_LBL}>Page Title</Label>
              <Input value={title} onChange={e => { setTitle(e.target.value); setIsDirty(true) }} placeholder="Page title" />
            </div>
            <div className="space-y-1.5">
              <Label className={STYLE_LBL}>Navigation Title</Label>
              <p className="text-xs text-muted-foreground -mt-1">Override the label shown for this page in the navigation. Leave blank to use the page title.</p>
              <Input value={navLabel} onChange={e => { setNavLabel(e.target.value); setIsDirty(true) }} placeholder={title} />
            </div>
            <div className="space-y-1.5">
              <Label className={STYLE_LBL}>URL Slug</Label>
              <Input value={initialSlug} readOnly className="text-muted-foreground bg-muted/50" />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <Label className="text-sm">Published</Label>
              <button type="button" onClick={() => { setPublished(v => !v); setIsDirty(true) }}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${published ? "bg-primary" : "bg-border"}`}>
                <span className={`inline-block h-4 w-4 transform rounded-full bg-card shadow transition-transform ${published ? "translate-x-4" : "translate-x-0.5"}`} />
              </button>
            </div>
            <Button className="w-full" onClick={() => { save(); setPageSettingsOpen(false) }} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* ── Block settings dialog ─────────────────────────────────────────── */}
      <Dialog open={!!editingId} onOpenChange={(open) => { if (!open) setEditingId(null) }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="capitalize">{editingBlock?.type} Block</DialogTitle>
          </DialogHeader>
          {editingBlock && (
            <BlockSettings block={editingBlock} onUpdate={(patch) => updateBlock(editingBlock.id, patch)} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
