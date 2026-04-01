"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import ChordProRenderer, { DEFAULT_STYLE, type ChordProStyle, type SongInfo } from "@/components/songbook/ChordProRenderer"
import { toast } from "sonner"
import ChordSheetJS from "chordsheetjs"
import {
  Trash2, Plus, ChevronDown, ChevronRight,
  GripVertical, X, Search, FileAudio, Link2, CalendarDays, Copy, Settings2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import ServicesBottomNav from "@/components/admin/ServicesBottomNav"

// ── Types ────────────────────────────────────────────────────────────────────

interface StreamingLinks {
  youtube?: string
  spotify?: string
  appleMusic?: string
  amazonMusic?: string
  vimeo?: string
}

interface FileEntry { name: string; url: string }

interface Arrangement {
  id: string
  name: string
  chordproText: string
  lengthSeconds: number | null
  bpm: number | null
  meter: string | null
  sequence: string[]
  streamingLinks: StreamingLinks
  fileUrls: FileEntry[]
  notes: string
  tags: string[]
  createdAt: Date
}

interface Song {
  id: string
  title: string
  author: string | null
  ccli: string | null
  coverImage: string | null
  copyright: string | null
  administration: string | null
  themes: string[]
  arrangements: Arrangement[]
}

interface RecentScheduled {
  date: string
  serviceTitle: string
  arrangementName: string | null
  category: { name: string; color: string } | null
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatLength(seconds: number | null): string {
  if (seconds == null) return ""
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`
}

function parseLength(value: string): number | null {
  const t = value.trim()
  if (!t) return null
  if (t.includes(":")) {
    const [m, s] = t.split(":").map(Number)
    if (isNaN(m) || isNaN(s)) return null
    return m * 60 + s
  }
  const n = Number(t)
  return isNaN(n) ? null : n
}

function normalizeArr(raw: Arrangement): Arrangement {
  return {
    ...raw,
    sequence: Array.isArray(raw.sequence) ? raw.sequence : [],
    streamingLinks: (raw.streamingLinks && typeof raw.streamingLinks === "object" && !Array.isArray(raw.streamingLinks))
      ? raw.streamingLinks as StreamingLinks : {},
    fileUrls: Array.isArray(raw.fileUrls) ? raw.fileUrls : [],
    notes: raw.notes ?? "",
    tags: Array.isArray(raw.tags) ? raw.tags : [],
  }
}

// ── Constants ─────────────────────────────────────────────────────────────────

const COMMON_SECTIONS = [
  "Intro", "Verse 1", "Verse 2", "Verse 3",
  "Pre-Chorus", "Chorus", "Post-Chorus",
  "Bridge", "Interlude", "Instrumental",
  "Outro", "Tag", "Vamp", "Hook", "Breakdown", "Lift",
]

const METERS = ["4/4", "3/4", "6/8", "2/4", "5/4", "7/8", "12/8"]

const STREAMING_PLATFORMS: { key: keyof StreamingLinks; label: string; searchUrl: (q: string) => string }[] = [
  { key: "youtube",     label: "YouTube",      searchUrl: (q) => `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}` },
  { key: "spotify",     label: "Spotify",      searchUrl: (q) => `https://open.spotify.com/search/${encodeURIComponent(q)}` },
  { key: "appleMusic",  label: "Apple Music",  searchUrl: (q) => `https://music.apple.com/search?term=${encodeURIComponent(q)}` },
  { key: "amazonMusic", label: "Amazon Music", searchUrl: (q) => `https://music.amazon.com/search/${encodeURIComponent(q)}` },
  { key: "vimeo",       label: "Vimeo",        searchUrl: (q) => `https://vimeo.com/search?q=${encodeURIComponent(q)}` },
]

const DOT_COLORS: Record<string, string> = {
  blue: "bg-blue-400", red: "bg-red-400", green: "bg-green-400",
  yellow: "bg-yellow-400", purple: "bg-purple-400", pink: "bg-pink-400",
  orange: "bg-orange-400", gray: "bg-gray-400", indigo: "bg-indigo-400",
  teal: "bg-teal-400", cyan: "bg-cyan-400",
}

// ── ChordPro Toolbar ──────────────────────────────────────────────────────────

function TBtn({
  title, onClick, children, wide,
}: { title: string; onClick: () => void; children: React.ReactNode; wide?: boolean }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={cn(
        "h-6 flex items-center justify-center rounded text-xs text-foreground hover:bg-accent transition-colors shrink-0",
        wide ? "px-1.5 min-w-[2.25rem]" : "w-6"
      )}
    >
      {children}
    </button>
  )
}

function Divider() {
  return <div className="w-px h-4 bg-border mx-0.5 shrink-0" />
}

function ChordProToolbar({
  textareaRef,
  value,
  onChange,
}: {
  textareaRef: React.RefObject<HTMLTextAreaElement | null>
  value: string
  onChange: (v: string) => void
}) {
  function insert(before: string, after = "") {
    const el = textareaRef.current
    if (!el) return
    const start = el.selectionStart
    const end = el.selectionEnd
    const selected = value.slice(start, end)
    const next = value.slice(0, start) + before + selected + after + value.slice(end)
    onChange(next)
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(start + before.length, start + before.length + selected.length)
    })
  }

  function transposeUp() {
    try {
      const parser = new ChordSheetJS.ChordProParser()
      const song = parser.parse(value)
      const transposed = song.transpose(1)
      const formatter = new ChordSheetJS.ChordProFormatter()
      onChange(formatter.format(transposed))
      toast.success("Transposed +1 semitone")
    } catch {
      toast.error("Could not transpose — check ChordPro syntax")
    }
  }

  return (
    <div className="flex items-center gap-0.5 flex-wrap px-2 py-1 border-b border-t bg-muted/40">
      {/* Formatting */}
      <TBtn title="Bold — wraps selection in {b}…{/b}" onClick={() => insert("{b}", "{/b}")}>
        <strong>B</strong>
      </TBtn>
      <TBtn title="Italic — wraps selection in {i}…{/i}" onClick={() => insert("{i}", "{/i}")}>
        <em>I</em>
      </TBtn>
      <TBtn title="Underline — wraps selection in {u}…{/u}" onClick={() => insert("{u}", "{/u}")}>
        <span className="underline">U</span>
      </TBtn>

      <Divider />

      {/* Music symbols */}
      <TBtn title="Flat ♭" onClick={() => insert("♭")}>♭</TBtn>
      <TBtn title="Sharp ♯" onClick={() => insert("♯")}>♯</TBtn>
      <TBtn title="Major (maj)" onClick={() => insert("maj")} wide>maj</TBtn>
      <TBtn title="Diminished °" onClick={() => insert("°")}>°</TBtn>
      <TBtn title="Half-diminished ø" onClick={() => insert("ø")}>ø</TBtn>

      <Divider />

      {/* Section labels */}
      <TBtn title="Insert column break {column_break}" onClick={() => insert("{column_break}\n")} wide>
        col↵
      </TBtn>
      <TBtn title="Insert page break {new_page}" onClick={() => insert("{new_page}\n")} wide>
        pg↵
      </TBtn>

      <Divider />

      {/* Transpose */}
      <TBtn title="Transpose all chords up 1 semitone" onClick={transposeUp} wide>
        T +1
      </TBtn>
    </div>
  )
}

// ── Inline editable field ─────────────────────────────────────────────────────

function InlineEdit({
  value, onChange, placeholder, className, inputClassName,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  className?: string
  inputClassName?: string
}) {
  const [editing, setEditing] = useState(false)
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => { if (editing) ref.current?.focus() }, [editing])

  if (editing) {
    return (
      <input
        ref={ref}
        value={value}
        onChange={e => onChange(e.target.value)}
        onBlur={() => setEditing(false)}
        onKeyDown={e => { if (e.key === "Enter") setEditing(false) }}
        className={cn("outline-none bg-transparent border-b border-primary w-full", inputClassName)}
      />
    )
  }
  return (
    <span
      onClick={() => setEditing(true)}
      className={cn(
        "cursor-text rounded px-0.5 -mx-0.5 hover:bg-accent/50 transition-colors",
        !value && "text-muted-foreground italic",
        className,
      )}
    >
      {value || placeholder || "—"}
    </span>
  )
}

function ThemeInput({ onAdd }: { onAdd: (t: string) => void }) {
  const [open, setOpen] = useState(false)
  const [val, setVal] = useState("")
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => { if (open) ref.current?.focus() }, [open])
  function submit() {
    const t = val.trim()
    if (t) { onAdd(t); setVal("") }
    setOpen(false)
  }
  if (!open) return (
    <button onClick={() => setOpen(true)} className="text-xs text-muted-foreground hover:text-foreground px-1 py-0.5 rounded hover:bg-accent transition-colors">
      <Plus className="h-3 w-3 inline mr-0.5" />Add
    </button>
  )
  return (
    <div className="flex items-center gap-1">
      <input
        ref={ref}
        value={val}
        onChange={e => setVal(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter") submit(); if (e.key === "Escape") { setVal(""); setOpen(false) } }}
        onBlur={submit}
        placeholder="Theme…"
        className="h-6 text-xs border rounded px-2 outline-none focus:ring-1 ring-primary w-24"
      />
    </div>
  )
}

// ── Sequence builder ──────────────────────────────────────────────────────────

function SequenceBuilder({
  sequence, onChange,
}: { sequence: string[]; onChange: (s: string[]) => void }) {
  const [customLabel, setCustomLabel] = useState("")
  const [showCustomInput, setShowCustomInput] = useState(false)
  const [hiddenOptions, setHiddenOptions] = useState<Set<string>>(new Set())
  const dragIndexRef = useRef<number | null>(null)
  const [dragOver, setDragOver] = useState<number | null>(null)

  const visibleOptions = COMMON_SECTIONS.filter(s => !hiddenOptions.has(s))

  function addLabel(label: string) { onChange([...sequence, label]) }
  function removeLabel(i: number) { onChange(sequence.filter((_, idx) => idx !== i)) }
  function addCustom() {
    const label = customLabel.trim()
    if (!label) return
    onChange([...sequence, label])
    setCustomLabel("")
  }

  function onDragStart(i: number) { dragIndexRef.current = i }
  function onDragOver(e: React.DragEvent, i: number) { e.preventDefault(); setDragOver(i) }
  function onDrop(i: number) {
    const from = dragIndexRef.current
    if (from == null || from === i) { setDragOver(null); return }
    const next = [...sequence]
    const [item] = next.splice(from, 1)
    next.splice(i, 0, item)
    onChange(next)
    dragIndexRef.current = null
    setDragOver(null)
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5 p-2 rounded-lg border bg-muted/30 min-h-[2.5rem]">
        {sequence.length === 0
          ? <p className="text-xs text-muted-foreground self-center px-1">No sections added yet — click labels below to build your sequence.</p>
          : sequence.map((label, i) => (
            <div
              key={i}
              draggable
              onDragStart={() => onDragStart(i)}
              onDragOver={e => onDragOver(e, i)}
              onDrop={() => onDrop(i)}
              onDragLeave={() => setDragOver(null)}
              className={cn(
                "flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 cursor-grab select-none transition-opacity",
                dragOver === i && "opacity-50 ring-2 ring-primary/40"
              )}
            >
              <GripVertical className="h-3 w-3 text-primary/40" />
              {label}
              <button
                onClick={(e) => { e.stopPropagation(); removeLabel(i) }}
                className="hover:text-destructive ml-0.5"
                title={`Remove ${label}`}
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </div>
          ))
        }
      </div>
      <div className="space-y-1.5">
        <div className="flex flex-wrap gap-1">
          {visibleOptions.map(label => (
            <span key={label} className="group flex items-center rounded-full border hover:bg-accent transition-colors overflow-hidden">
              <button onClick={() => addLabel(label)} className="text-xs px-2 py-0.5">
                {label}
              </button>
              <button
                onClick={() => setHiddenOptions(prev => new Set([...prev, label]))}
                className="pr-1.5 text-muted-foreground hover:text-destructive hidden group-hover:inline-flex items-center"
                title={`Remove ${label} option`}
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </span>
          ))}
        </div>
        {showCustomInput ? (
          <div className="flex items-center gap-2">
            <Input
              placeholder="Label name…"
              value={customLabel}
              onChange={e => setCustomLabel(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter") { addCustom(); setShowCustomInput(false) }
                if (e.key === "Escape") { setCustomLabel(""); setShowCustomInput(false) }
              }}
              autoFocus
              className="h-7 text-xs flex-1"
            />
            <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => { addCustom(); setShowCustomInput(false) }} disabled={!customLabel.trim()}>
              Add
            </Button>
            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => { setCustomLabel(""); setShowCustomInput(false) }}>
              Cancel
            </Button>
          </div>
        ) : (
          <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-muted-foreground" onClick={() => setShowCustomInput(true)}>
            <Plus className="h-3 w-3 mr-1" /> Custom label
          </Button>
        )}
      </div>
    </div>
  )
}

// ── Streaming Links Dialog ─────────────────────────────────────────────────────

function StreamingLinksDialog({
  open, onOpenChange, links, onChange, searchQuery,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  links: StreamingLinks
  onChange: (key: keyof StreamingLinks, value: string) => void
  searchQuery: string
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Link2 className="h-4 w-4" /> Streaming Links</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 pt-2">
          {STREAMING_PLATFORMS.map(({ key, label, searchUrl }) => (
            <div key={key} className="space-y-1">
              <Label className="text-xs text-muted-foreground">{label}</Label>
              <div className="flex gap-2">
                <Input
                  placeholder={`Paste ${label} URL…`}
                  value={links[key] ?? ""}
                  onChange={e => onChange(key, e.target.value)}
                  className="h-8 text-sm flex-1"
                />
                <a
                  href={searchUrl(searchQuery)}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={`Search "${searchQuery}" on ${label}`}
                  className="h-8 px-2 inline-flex items-center gap-1 rounded-md border text-xs text-muted-foreground hover:bg-accent transition-colors shrink-0"
                >
                  <Search className="h-3 w-3" /> Search
                </a>
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ── Files Dialog ──────────────────────────────────────────────────────────────

function FilesDialog({
  open, onOpenChange, files, onAdd, onRemove,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  files: FileEntry[]
  onAdd: (f: FileEntry) => void
  onRemove: (i: number) => void
}) {
  const [newFile, setNewFile] = useState({ name: "", url: "" })

  function add() {
    if (!newFile.name || !newFile.url) return
    onAdd({ ...newFile })
    setNewFile({ name: "", url: "" })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><FileAudio className="h-4 w-4" /> Files</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 pt-2">
          {files.length === 0
            ? <p className="text-sm text-muted-foreground">No files added yet.</p>
            : files.map((f, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <a href={f.url} target="_blank" rel="noopener noreferrer" className="flex-1 truncate text-primary hover:underline">{f.name}</a>
                <button onClick={() => onRemove(i)} className="text-muted-foreground hover:text-destructive shrink-0">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))
          }
          <div className="border-t pt-3 space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Add file</p>
            <Input placeholder="File name…" value={newFile.name} onChange={e => setNewFile(f => ({ ...f, name: e.target.value }))} className="h-8 text-sm" />
            <Input placeholder="URL…" value={newFile.url} onChange={e => setNewFile(f => ({ ...f, url: e.target.value }))} className="h-8 text-sm" />
            <Button size="sm" variant="outline" onClick={add} disabled={!newFile.name || !newFile.url}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Add File
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ── Arrangement row ───────────────────────────────────────────────────────────

function ArrangementRow({
  arr, isOpen, onToggle, onUpdate, onDelete, onDuplicate, songTitle,
}: {
  arr: Arrangement
  isOpen: boolean
  onToggle: () => void
  onUpdate: (patch: Partial<Arrangement>) => void
  onDelete: () => void
  onDuplicate: () => void
  songTitle: string
}) {
  const [streamingOpen, setStreamingOpen] = useState(false)
  const [filesOpen, setFilesOpen] = useState(false)
  const [tagInput, setTagInput] = useState("")
  const [lengthInput, setLengthInput] = useState(() => formatLength(arr.lengthSeconds))
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  function addTag(t: string) {
    const tag = t.trim()
    if (!tag || arr.tags.includes(tag)) return
    onUpdate({ tags: [...arr.tags, tag] })
    setTagInput("")
  }

  const searchQuery = [songTitle, arr.name].filter(Boolean).join(" ")
  const hasStreaming = Object.values(arr.streamingLinks).some(Boolean)

  return (
    <div>
      {/* Collapsed row */}
      <button
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-accent/50 transition-colors text-left"
        onClick={onToggle}
      >
        {isOpen
          ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
          : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
        }
        <span className="font-medium text-sm flex-1 truncate">{arr.name}</span>
        <div className="flex items-center gap-2 shrink-0 text-xs text-muted-foreground">
          {arr.bpm && <span>{arr.bpm} BPM</span>}
          {arr.meter && <span>{arr.meter}</span>}
          {arr.lengthSeconds != null && <span>{formatLength(arr.lengthSeconds)}</span>}
          {arr.tags.length > 0 && <span>{arr.tags.slice(0, 2).join(", ")}</span>}
        </div>
      </button>

      {/* Expanded editor */}
      {isOpen && (
        <div className="border-t bg-muted/20">
          <div className="px-4 pb-5 pt-4 space-y-4">

              {/* Details row */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Name</Label>
                  <Input value={arr.name} onChange={e => onUpdate({ name: e.target.value })} className="h-8 text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Length</Label>
                  <Input
                    placeholder="3:45"
                    value={lengthInput}
                    onChange={e => setLengthInput(e.target.value)}
                    onBlur={() => {
                      const parsed = parseLength(lengthInput)
                      onUpdate({ lengthSeconds: parsed })
                      setLengthInput(formatLength(parsed))
                    }}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">BPM</Label>
                  <Input
                    type="number"
                    min={1} max={300}
                    placeholder="120"
                    value={arr.bpm ?? ""}
                    onChange={e => onUpdate({ bpm: e.target.value ? parseInt(e.target.value) : null })}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Meter</Label>
                  <select
                    className="h-8 w-full rounded-md border bg-background px-2 text-sm"
                    value={arr.meter ?? ""}
                    onChange={e => onUpdate({ meter: e.target.value || null })}
                  >
                    <option value="">—</option>
                    {METERS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              </div>

              {/* Sequence */}
              <div className="space-y-1">
                <Label className="text-xs">Song Sequence</Label>
                <SequenceBuilder
                  sequence={arr.sequence}
                  onChange={seq => onUpdate({ sequence: seq })}
                />
              </div>

              {/* ChordPro editor */}
              <div className="space-y-1">
                <Label className="text-xs">ChordPro Chart</Label>
                <div className="rounded-md border overflow-hidden">
                  <ChordProToolbar
                    textareaRef={textareaRef}
                    value={arr.chordproText}
                    onChange={v => onUpdate({ chordproText: v })}
                  />
                  <Textarea
                    ref={textareaRef}
                    rows={10}
                    className="font-mono text-sm rounded-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                    value={arr.chordproText}
                    onChange={e => onUpdate({ chordproText: e.target.value })}
                  />
                </div>
              </div>

              {/* Notes + Tags side by side */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Notes</Label>
                  <Textarea
                    rows={3}
                    placeholder="Key changes, special instructions…"
                    value={arr.notes}
                    onChange={e => onUpdate({ notes: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Tags</Label>
                  <div className="flex flex-wrap gap-1.5 items-start min-h-[4rem] border rounded-md p-2 bg-background">
                    {arr.tags.map(tag => (
                      <span key={tag} className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">
                        {tag}
                        <button onClick={() => onUpdate({ tags: arr.tags.filter(t => t !== tag) })} className="hover:text-destructive">
                          <X className="h-2.5 w-2.5" />
                        </button>
                      </span>
                    ))}
                    <div className="flex gap-1 mt-auto w-full">
                      <Input
                        placeholder="Add tag…"
                        value={tagInput}
                        onChange={e => setTagInput(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") { addTag(tagInput); e.preventDefault() } }}
                        className="h-6 text-xs flex-1"
                      />
                      <Button size="sm" variant="outline" className="h-6 px-1.5" onClick={() => addTag(tagInput)} disabled={!tagInput.trim()}>
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Streaming + Files buttons */}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={hasStreaming ? "default" : "outline"}
                  className="h-7 text-xs px-3"
                  onClick={() => setStreamingOpen(true)}
                >
                  <Link2 className="h-3 w-3 mr-1.5" />
                  Streaming Links
                  {hasStreaming && <span className="ml-1.5 text-[10px] opacity-70">({Object.values(arr.streamingLinks).filter(Boolean).length})</span>}
                </Button>
                <Button
                  size="sm"
                  variant={arr.fileUrls.length > 0 ? "default" : "outline"}
                  className="h-7 text-xs px-3"
                  onClick={() => setFilesOpen(true)}
                >
                  <FileAudio className="h-3 w-3 mr-1.5" />
                  Files
                  {arr.fileUrls.length > 0 && <span className="ml-1.5 text-[10px] opacity-70">({arr.fileUrls.length})</span>}
                </Button>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-1 border-t">
                <Button size="sm" variant="outline" onClick={onDuplicate} title="Duplicate this arrangement">
                  <Copy className="h-3.5 w-3.5 mr-1" /> Duplicate
                </Button>
                <Button
                  size="sm" variant="ghost"
                  className="ml-auto text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={onDelete}
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                </Button>
              </div>

          </div>
        </div>
      )}

      {/* Dialogs */}
      <StreamingLinksDialog
        open={streamingOpen}
        onOpenChange={setStreamingOpen}
        links={arr.streamingLinks}
        onChange={(key, value) => onUpdate({ streamingLinks: { ...arr.streamingLinks, [key]: value || undefined } })}
        searchQuery={searchQuery}
      />
      <FilesDialog
        open={filesOpen}
        onOpenChange={setFilesOpen}
        files={arr.fileUrls}
        onAdd={f => onUpdate({ fileUrls: [...arr.fileUrls, f] })}
        onRemove={i => onUpdate({ fileUrls: arr.fileUrls.filter((_, idx) => idx !== i) })}
      />
    </div>
  )
}

// ── Main SongEditor ───────────────────────────────────────────────────────────

export default function SongEditor({
  song: initialSong,
  recentScheduled = [],
}: {
  song: Song
  recentScheduled?: RecentScheduled[]
}) {
  const router = useRouter()
  const [song, setSong] = useState<Song>(() => ({
    ...initialSong,
    arrangements: initialSong.arrangements.map(normalizeArr),
  }))
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle")
  const songSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isMountSong = useRef(true)
  const latestSongRef = useRef(song)
  const arrSaveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [addingArr, setAddingArr] = useState(false)
  const [newArr, setNewArr] = useState({ name: "", chordproText: "", lengthSeconds: "" })

  // Preview style — persisted in localStorage as a song-library-wide setting
  const [previewStyle, setPreviewStyle] = useState<ChordProStyle>(() => {
    if (typeof window === "undefined") return DEFAULT_STYLE
    try {
      const stored = localStorage.getItem("chordpro-preview-style")
      return stored ? { ...DEFAULT_STYLE, ...JSON.parse(stored) } : DEFAULT_STYLE
    } catch { return DEFAULT_STYLE }
  })
  const [showStylePanel, setShowStylePanel] = useState(false)
  const [showDetailsDialog, setShowDetailsDialog] = useState(false)
  const [arrDragIdx, setArrDragIdx] = useState<number | null>(null)
  const [arrDragOver, setArrDragOver] = useState<number | null>(null)

  // Keep a ref to latest song for debounced arr saves
  useEffect(() => { latestSongRef.current = song }, [song])

  // Auto-save song metadata
  useEffect(() => {
    if (isMountSong.current) { isMountSong.current = false; return }
    setSaveStatus("saving")
    if (songSaveTimer.current) clearTimeout(songSaveTimer.current)
    songSaveTimer.current = setTimeout(async () => {
      await fetch(`/api/songs/${song.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: song.title, author: song.author, ccli: song.ccli,
          coverImage: song.coverImage, copyright: song.copyright,
          administration: song.administration, themes: song.themes,
        }),
      })
      setSaveStatus("saved")
      setTimeout(() => setSaveStatus("idle"), 2000)
    }, 800)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [song.title, song.author, song.ccli, song.coverImage, song.copyright, song.administration, song.themes])

  // Album cover file input
  const coverFileRef = useRef<HTMLInputElement>(null)

  // Draggable divider between arrangements and preview
  const [previewW, setPreviewW] = useState(380)
  const isDragging = useRef(false)
  const dragStartX = useRef(0)
  const dragStartW = useRef(0)
  const containerRef = useRef<HTMLDivElement>(null)

  function onDividerMouseDown(e: React.MouseEvent) {
    isDragging.current = true
    dragStartX.current = e.clientX
    dragStartW.current = previewW
    const onMove = (ev: MouseEvent) => {
      if (!isDragging.current) return
      const delta = dragStartX.current - ev.clientX
      setPreviewW(Math.max(260, Math.min(700, dragStartW.current + delta)))
    }
    const onUp = () => {
      isDragging.current = false
      window.removeEventListener("mousemove", onMove)
      window.removeEventListener("mouseup", onUp)
    }
    window.addEventListener("mousemove", onMove)
    window.addEventListener("mouseup", onUp)
  }

  function updatePreviewStyle(patch: Partial<ChordProStyle>) {
    const next = { ...previewStyle, ...patch }
    setPreviewStyle(next)
    try { localStorage.setItem("chordpro-preview-style", JSON.stringify(next)) } catch { /* ignore */ }
  }

  async function deleteSong() {
    if (!confirm("Delete this song?")) return
    await fetch(`/api/songs/${song.id}`, { method: "DELETE" })
    router.push("/mychurch/songs")
  }

  async function addArrangement() {
    if (!newArr.name || !newArr.chordproText) { toast.error("Name and ChordPro content required"); return }
    const res = await fetch("/api/arrangements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        songId: song.id, name: newArr.name, chordproText: newArr.chordproText,
        lengthSeconds: parseLength(newArr.lengthSeconds),
      }),
    })
    if (res.ok) {
      const arr = await res.json()
      setSong(s => ({ ...s, arrangements: [...s.arrangements, normalizeArr(arr)] }))
      setNewArr({ name: "", chordproText: "", lengthSeconds: "" })
      setAddingArr(false)
      setExpandedId(arr.id)
      toast.success("Arrangement added")
    } else {
      toast.error("Failed to add arrangement")
    }
  }

  function updateArr(id: string, patch: Partial<Arrangement>) {
    setSong(s => ({ ...s, arrangements: s.arrangements.map(a => a.id === id ? { ...a, ...patch } : a) }))
    setSaveStatus("saving")
    if (arrSaveTimers.current[id]) clearTimeout(arrSaveTimers.current[id])
    arrSaveTimers.current[id] = setTimeout(async () => {
      const arr = latestSongRef.current.arrangements.find(a => a.id === id)
      if (!arr) return
      await fetch(`/api/arrangements/${arr.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: arr.name, chordproText: arr.chordproText, lengthSeconds: arr.lengthSeconds,
          bpm: arr.bpm, meter: arr.meter, sequence: arr.sequence,
          streamingLinks: arr.streamingLinks, fileUrls: arr.fileUrls,
          notes: arr.notes, tags: arr.tags,
        }),
      })
      setSaveStatus("saved")
      setTimeout(() => setSaveStatus("idle"), 2000)
    }, 800)
  }

  async function deleteArr(id: string) {
    if (!confirm("Delete arrangement?")) return
    await fetch(`/api/arrangements/${id}`, { method: "DELETE" })
    setSong(s => ({ ...s, arrangements: s.arrangements.filter(a => a.id !== id) }))
    if (expandedId === id) setExpandedId(null)
    toast.success("Arrangement deleted")
  }

  async function duplicateArr(arr: Arrangement) {
    const createRes = await fetch("/api/arrangements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        songId: song.id,
        name: `${arr.name} (Copy)`,
        chordproText: arr.chordproText,
        lengthSeconds: arr.lengthSeconds,
      }),
    })
    if (!createRes.ok) { toast.error("Failed to duplicate"); return }
    const created = await createRes.json()

    // Copy remaining fields
    const patchRes = await fetch(`/api/arrangements/${created.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bpm: arr.bpm, meter: arr.meter, sequence: arr.sequence,
        streamingLinks: arr.streamingLinks, fileUrls: arr.fileUrls,
        notes: arr.notes, tags: arr.tags,
      }),
    })
    const full = patchRes.ok ? await patchRes.json() : created
    setSong(s => ({ ...s, arrangements: [...s.arrangements, normalizeArr({ ...created, ...full })] }))
    setExpandedId(created.id)
    toast.success("Arrangement duplicated")
  }

  function reorderArrangements(fromIdx: number, toIdx: number) {
    if (fromIdx === toIdx) return
    const next = [...song.arrangements]
    const [moved] = next.splice(fromIdx, 1)
    next.splice(toIdx, 0, moved)
    setSong(s => ({ ...s, arrangements: next }))
    // Persist new orders
    next.forEach((arr, i) => {
      fetch(`/api/arrangements/${arr.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order: i }),
      })
    })
  }

  const expandedArr = expandedId ? song.arrangements.find(a => a.id === expandedId) : null

  return (
    <div className="space-y-4 pb-24 md:pb-0">

      {/* Song details card */}
      <Card>
        <CardContent className="flex gap-5 pt-5 pb-5 relative">
          {/* Gear button */}
          <button
            onClick={() => setShowDetailsDialog(true)}
            className="absolute top-3 right-3 p-1.5 rounded hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
            title="Edit details"
          >
            <Settings2 className="h-4 w-4" />
          </button>

          {/* Auto-save status */}
          <span className="absolute bottom-3 right-3 text-xs text-muted-foreground">
            {saveStatus === "saving" ? "Saving…" : saveStatus === "saved" ? "Saved" : ""}
          </span>

          {/* Album cover */}
          <div className="shrink-0">
            <button
              onClick={() => coverFileRef.current?.click()}
              className="relative w-20 h-20 rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/20 overflow-hidden flex items-center justify-center hover:border-primary/50 transition-colors group"
              title="Upload album cover"
            >
              {song.coverImage
                ? <img src={song.coverImage} alt="Cover" className="w-full h-full object-cover" />
                : <span className="text-[10px] text-muted-foreground text-center px-2 leading-tight">Cover</span>
              }
              {song.coverImage && (
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <span className="text-[10px] text-white">Change</span>
                </div>
              )}
            </button>
            <input ref={coverFileRef} type="file" accept="image/*" className="hidden"
              onChange={e => {
                const file = e.target.files?.[0]; if (!file) return
                const reader = new FileReader()
                reader.onload = ev => setSong(s => ({ ...s, coverImage: (ev.target?.result as string) || null }))
                reader.readAsDataURL(file); e.target.value = ""
              }}
            />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0 py-0.5 pr-8">
            <p className="text-xl font-bold leading-tight truncate">{song.title || <span className="text-muted-foreground italic font-normal">Untitled</span>}</p>
            {song.author && <p className="text-sm text-muted-foreground mt-0.5">{song.author}</p>}
            <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-2">
              {song.ccli           && <span className="text-xs text-muted-foreground">CCLI #{song.ccli}</span>}
              {song.copyright      && <span className="text-xs text-muted-foreground">© {song.copyright}</span>}
              {song.administration && <span className="text-xs text-muted-foreground">{song.administration}</span>}
            </div>
            {song.themes.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {song.themes.map(t => (
                  <span key={t} className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">{t}</span>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Details dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Song Details</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            {/* Cover + title/author */}
            <div className="flex gap-4">
              <div className="shrink-0 space-y-1">
                <button
                  onClick={() => coverFileRef.current?.click()}
                  className="relative w-20 h-20 rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/20 overflow-hidden flex items-center justify-center hover:border-primary/50 transition-colors group"
                >
                  {song.coverImage
                    ? <img src={song.coverImage} alt="Cover" className="w-full h-full object-cover" />
                    : <span className="text-[10px] text-muted-foreground text-center px-2 leading-tight">Click to upload</span>
                  }
                  {song.coverImage && (
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="text-[10px] text-white">Change</span>
                    </div>
                  )}
                </button>
                {song.coverImage && (
                  <button onClick={() => setSong(s => ({ ...s, coverImage: null }))} className="text-[10px] text-muted-foreground hover:text-destructive w-full text-center">Remove</button>
                )}
              </div>
              <div className="flex-1 space-y-2">
                <div className="space-y-1">
                  <Label className="text-xs">Title</Label>
                  <Input value={song.title} onChange={e => setSong(s => ({ ...s, title: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Artist / Author</Label>
                  <Input value={song.author ?? ""} onChange={e => setSong(s => ({ ...s, author: e.target.value || null }))} />
                </div>
              </div>
            </div>

            {/* Metadata fields */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">CCLI #</Label>
                <Input placeholder="e.g. 1234567" value={song.ccli ?? ""} onChange={e => setSong(s => ({ ...s, ccli: e.target.value || null }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Copyright</Label>
                <Input placeholder="e.g. 2020 Bethel Music" value={song.copyright ?? ""} onChange={e => setSong(s => ({ ...s, copyright: e.target.value || null }))} />
              </div>
              <div className="space-y-1 col-span-2">
                <Label className="text-xs">Administration</Label>
                <Input placeholder="e.g. Capitol CMG Publishing" value={song.administration ?? ""} onChange={e => setSong(s => ({ ...s, administration: e.target.value || null }))} />
              </div>
            </div>

            {/* Themes */}
            <div className="space-y-1.5">
              <Label className="text-xs">Themes</Label>
              <div className="flex flex-wrap gap-1.5 min-h-[2rem] p-2 rounded-md border bg-muted/20">
                {song.themes.map(t => (
                  <span key={t} className="flex items-center gap-0.5 text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">
                    {t}
                    <button onClick={() => setSong(s => ({ ...s, themes: s.themes.filter(x => x !== t) }))} className="hover:text-destructive ml-0.5">
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </span>
                ))}
                <ThemeInput onAdd={theme => setSong(s => ({ ...s, themes: [...s.themes, theme] }))} />
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Arrangements + Preview */}
      <div ref={containerRef} className="flex items-start">
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Arrangements</h2>
            <Button size="sm" variant="outline" onClick={() => { setAddingArr(true); setExpandedId(null) }}>
              <Plus className="h-4 w-4 mr-1" /> Add Arrangement
            </Button>
          </div>

          {addingArr && (
            <Card className="border-primary/30">
              <CardHeader className="py-3"><CardTitle className="text-sm">New Arrangement</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Name</Label>
                    <Input
                      placeholder="e.g. Full Band, Acoustic"
                      value={newArr.name}
                      onChange={e => setNewArr({ ...newArr, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Length</Label>
                    <Input
                      placeholder="3:45"
                      value={newArr.lengthSeconds}
                      onChange={e => setNewArr({ ...newArr, lengthSeconds: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>ChordPro Content</Label>
                  <Textarea
                    rows={8}
                    className="font-mono text-sm"
                    placeholder="{title: Amazing Grace}&#10;{key: G}&#10;&#10;[G]Amazing [G7]grace how [C]sweet the [G]sound"
                    value={newArr.chordproText}
                    onChange={e => setNewArr({ ...newArr, chordproText: e.target.value })}
                  />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={addArrangement}>Save Arrangement</Button>
                  <Button size="sm" variant="outline" onClick={() => setAddingArr(false)}>Cancel</Button>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="rounded-lg border divide-y overflow-hidden">
            {song.arrangements.length === 0 && (
              <p className="px-4 py-6 text-sm text-muted-foreground text-center">No arrangements yet.</p>
            )}
            {song.arrangements.map((arr, i) => (
              <div
                key={arr.id}
                draggable
                onDragStart={() => setArrDragIdx(i)}
                onDragOver={e => { e.preventDefault(); setArrDragOver(i) }}
                onDrop={() => {
                  if (arrDragIdx !== null) reorderArrangements(arrDragIdx, i)
                  setArrDragIdx(null); setArrDragOver(null)
                }}
                onDragEnd={() => { setArrDragIdx(null); setArrDragOver(null) }}
                className={arrDragOver === i && arrDragIdx !== i ? "ring-2 ring-primary/40 ring-inset" : undefined}
              >
                <ArrangementRow
                  arr={arr}
                  isOpen={expandedId === arr.id}
                  onToggle={() => setExpandedId(expandedId === arr.id ? null : arr.id)}
                  onUpdate={patch => updateArr(arr.id, patch)}
                  onDelete={() => deleteArr(arr.id)}
                  onDuplicate={() => duplicateArr(arr)}
                  songTitle={song.title}
                />
              </div>
            ))}
          </div>
        </div>

        {/* ── Drag handle ─────────────────────────────────────────────────── */}
        {expandedArr && (
          <div
            onMouseDown={onDividerMouseDown}
            className="hidden md:flex w-2 shrink-0 self-stretch items-center justify-center cursor-col-resize group mx-1"
            title="Drag to resize"
          >
            <div className="w-0.5 h-12 rounded-full bg-border group-hover:bg-primary/40 transition-colors" />
          </div>
        )}

        {/* ── Preview panel ───────────────────────────────────────────────── */}
        {expandedArr && (
          <div className="hidden md:block shrink-0 self-start sticky top-4" style={{ width: previewW }}>
            <div className="flex items-center justify-between mb-2 px-0.5">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Preview</p>
              <button
                onClick={() => setShowStylePanel(v => !v)}
                title="Style settings"
                className={cn(
                  "p-1 rounded hover:bg-accent transition-colors",
                  showStylePanel && "bg-accent"
                )}
              >
                <Settings2 className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            </div>

            {showStylePanel && (
              <div className="mb-3 p-3 border rounded-lg bg-card shadow-sm space-y-3 text-xs">
                <p className="font-medium text-muted-foreground uppercase tracking-wide" style={{ fontSize: "0.65rem" }}>
                  Song Library Style
                </p>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-muted-foreground">Font</label>
                    <select
                      className="w-full h-7 rounded-md border bg-background px-2 text-xs"
                      value={previewStyle.fontFamily}
                      onChange={e => updatePreviewStyle({ fontFamily: e.target.value as ChordProStyle["fontFamily"] })}
                    >
                      <option value="mono">Monospace</option>
                      <option value="serif">Serif</option>
                      <option value="sans">Sans-serif</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-muted-foreground">Size: {previewStyle.fontSize}px</label>
                    <input
                      type="range" min={10} max={24} step={1}
                      value={previewStyle.fontSize}
                      onChange={e => updatePreviewStyle({ fontSize: Number(e.target.value) })}
                      className="w-full accent-primary mt-1.5"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-muted-foreground">Columns</label>
                  <div className="flex gap-1.5">
                    {([1, 2, 3] as const).map(n => (
                      <button
                        key={n}
                        onClick={() => updatePreviewStyle({ columns: n })}
                        className={cn(
                          "h-7 w-9 rounded border text-xs font-medium transition-colors",
                          previewStyle.columns === n
                            ? "bg-primary text-primary-foreground border-primary"
                            : "hover:bg-accent text-muted-foreground"
                        )}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-muted-foreground">Margins (inches)</label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {(["marginTop", "marginRight", "marginBottom", "marginLeft"] as const).map(key => {
                      const lbl = { marginTop: "Top", marginRight: "Right", marginBottom: "Bot", marginLeft: "Left" }[key]
                      return (
                        <div key={key} className="space-y-0.5">
                          <span className="block text-center text-muted-foreground" style={{ fontSize: "0.6rem" }}>{lbl}</span>
                          <input
                            type="number" min={0} max={3} step={0.25}
                            value={previewStyle[key]}
                            onChange={e => updatePreviewStyle({ [key]: parseFloat(e.target.value) || 0 })}
                            className="w-full h-7 rounded-md border bg-background px-1 text-xs text-center"
                          />
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {([
                    { key: "chordColor",   label: "Chords"   },
                    { key: "textColor",    label: "Lyrics"   },
                    { key: "sectionColor", label: "Sections" },
                  ] as const).map(({ key, label }) => (
                    <div key={key} className="space-y-1">
                      <label className="text-muted-foreground">{label}</label>
                      <input
                        type="color"
                        value={previewStyle[key]}
                        onChange={e => updatePreviewStyle({ [key]: e.target.value })}
                        className="h-7 w-full rounded border cursor-pointer"
                      />
                    </div>
                  ))}
                </div>

                <button
                  className="text-xs text-muted-foreground underline hover:text-foreground"
                  onClick={() => updatePreviewStyle(DEFAULT_STYLE)}
                >
                  Reset defaults
                </button>
              </div>
            )}

            <ChordProRenderer
              chordproText={expandedArr.chordproText}
              pageView
              style={previewStyle}
              songInfo={{
                title: song.title,
                artist: song.author ?? undefined,
                arrangementName: expandedArr.name,
                bpm: expandedArr.bpm,
                meter: expandedArr.meter,
                sequence: expandedArr.sequence,
              } satisfies SongInfo}
            />
          </div>
        )}
      </div>

      {/* Recently scheduled */}
      {recentScheduled.length > 0 && (
        <div className="space-y-2">
          <h2 className="font-semibold flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            Recently Scheduled
          </h2>
          <div className="rounded-lg border divide-y">
            {recentScheduled.map((item, i) => {
              const d = new Date(item.date)
              const dateStr = d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
              return (
                <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                  <span className="text-sm text-muted-foreground w-28 shrink-0">{dateStr}</span>
                  <span className="text-sm flex-1 truncate">{item.serviceTitle}</span>
                  {item.arrangementName && (
                    <span className="text-xs text-muted-foreground shrink-0">{item.arrangementName}</span>
                  )}
                  {item.category && (
                    <div className="flex items-center gap-1 shrink-0">
                      <span className={cn("h-2 w-2 rounded-full shrink-0", DOT_COLORS[item.category.color] ?? "bg-gray-400")} />
                      <span className="text-xs text-muted-foreground">{item.category.name}</span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Delete */}
      <div className="pt-4 border-t">
        <Button variant="destructive" size="sm" onClick={deleteSong}>
          <Trash2 className="h-4 w-4 mr-1" /> Delete Song
        </Button>
      </div>

      <ServicesBottomNav active="songs" />
    </div>
  )
}
