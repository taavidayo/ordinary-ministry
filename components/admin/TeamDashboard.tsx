"use client"

import { useState, useRef, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import ProjectBoard from "@/components/admin/team/ProjectBoard"
import ChecklistWidget from "@/components/admin/dashboard/ChecklistWidget"
import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import TiptapPlaceholder from "@tiptap/extension-placeholder"
import TiptapUnderline from "@tiptap/extension-underline"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { toast } from "sonner"
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import ChannelLinksCard from "@/components/admin/ChannelLinksCard"
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Edit2,
  Check,
  X,
  Plus,
  Trash2,
  Users,
  Briefcase,
  CalendarDays,
  ClipboardList,
  FolderOpen,
  GripVertical,
  FileText,
  Youtube,
  ListVideo,
  ImageIcon,
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Heading3,
  MessageSquare,
  Settings,
  Upload,
  Archive,
} from "lucide-react"

// ─── Types ────────────────────────────────────────────────────────────────────

interface UserMin {
  id: string
  name: string
}

interface TeamNote {
  id: string
  subjectId: string
  authorId: string
  content: string
  createdAt: Date | string
  subject: UserMin
  author: UserMin
}

interface TaskStatus {
  id: string
  name: string
  color: string
  order: number
}

interface TaskComment {
  id: string
  content: string
  createdAt: Date | string
  author: UserMin
  parentId: string | null
}

interface TeamTask {
  id: string
  content: string
  description: string | null
  done: boolean
  priority: string
  statusId: string | null
  status: TaskStatus | null
  assignedToId: string | null
  projectId: string | null
  parentId: string | null
  dueDate: Date | string | null
  assignedTo: UserMin | null
  assignees: { id: string; userId: string; user: UserMin }[]
  subtasks: TeamTask[] | undefined
  comments: TaskComment[]
  createdAt: Date | string
}

interface ProjectComment {
  id: string
  content: string
  createdAt: Date | string
  author: UserMin
  parentId: string | null
}

interface TeamProject {
  id: string
  name: string
  description: string | null
  archived: boolean
  createdAt: Date | string
  tasks: TeamTask[]
  comments: ProjectComment[]
}

interface TrainingCompletion {
  userId: string
}

interface ChecklistItemType {
  id: string
  content: string
  isHeader: boolean
  order: number
  roleId: string | null
  role: { id: string; name: string } | null
}

interface TeamChecklistType {
  id: string
  name: string
  order: number
  categoryId: string | null
  category: { id: string; name: string; color: string } | null
  items: ChecklistItemType[]
}

// Keep for backwards compat alias
type TeamChecklistItem = ChecklistItemType

interface TrainingStep {
  id: string
  title: string
  content: string
  order: number
  completions: TrainingCompletion[]
}

interface TrainingModule {
  id: string
  title: string
  description: string | null
  order: number
  steps: TrainingStep[]
}

interface TeamMember {
  id: string
  isLeader: boolean
  memberRoles: { roleId: string }[]
  user: {
    id: string
    name: string
    email: string
    avatar: string | null
  }
}

interface TeamRole {
  id: string
  name: string
  needed: number
}

interface TeamChannel { id: string; name: string }

interface Team {
  id: string
  name: string
  description: string | null
  imageUrl: string | null
  imageFocalX: number | null
  imageFocalY: number | null
  archivedAt: string | null
  channels: TeamChannel[]
  members: TeamMember[]
  roles: TeamRole[]
  notes: TeamNote[]
  tasks: TeamTask[]
  projects: TeamProject[]
  taskStatuses: TaskStatus[]
  trainingModules: TrainingModule[]
  checklists: TeamChecklistType[]
}

interface ServiceHistoryItem {
  userId: string | null
  role: { name: string }
  serviceTeam: {
    service: {
      date: Date | string
      title: string
      category: { name: string } | null
    }
  }
}

interface TeamDashboardProps {
  team: Team
  serviceHistory: ServiceHistoryItem[]
  userRole: string
  currentUserId: string
  allChannels: TeamChannel[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function initials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

function formatDate(d: Date | string | null | undefined) {
  if (!d) return "—"
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

// ─── Inline Editable Field ────────────────────────────────────────────────────

function InlineEdit({
  value,
  onSave,
  multiline = false,
  className = "",
  placeholder = "",
}: {
  value: string
  onSave: (v: string) => Promise<void>
  multiline?: boolean
  className?: string
  placeholder?: string
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const [saving, setSaving] = useState(false)

  async function save() {
    if (draft === value) { setEditing(false); return }
    setSaving(true)
    await onSave(draft)
    setSaving(false)
    setEditing(false)
  }

  if (!editing) {
    return (
      <span
        className={`cursor-pointer hover:underline decoration-dotted ${className}`}
        onClick={() => { setDraft(value); setEditing(true) }}
        title="Click to edit"
      >
        {value || <span className="text-muted-foreground italic">{placeholder || "Click to edit"}</span>}
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1">
      {multiline ? (
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className="min-h-[60px] text-sm"
          autoFocus
        />
      ) : (
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className="h-8 text-sm"
          autoFocus
          onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") setEditing(false) }}
        />
      )}
      <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={save} disabled={saving}>
        <Check className="h-3.5 w-3.5 text-green-600" />
      </Button>
      <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={() => setEditing(false)}>
        <X className="h-3.5 w-3.5 text-destructive" />
      </Button>
    </span>
  )
}

// ─── PendingItemInput ─────────────────────────────────────────────────────────
// No onBlur — Radix DropdownMenu returns focus to the trigger after closing,
// which fires onBlur immediately (before the user types anything), discarding the
// input. Instead we use a document mousedown listener that only activates after
// a short delay (once Radix finishes its focus restoration).

function PendingItemInput({
  isHeader,
  onCommit,
  onDiscard,
}: {
  isHeader: boolean
  onCommit: (content: string, continueAdding: boolean) => void
  onDiscard: () => void
}) {
  const [value, setValue] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)
  const valueRef = useRef("")       // always current, readable inside closures
  const doneRef = useRef(false)
  const readyRef = useRef(false)   // prevents outside-click from firing during Radix cleanup

  // Sync valueRef alongside state
  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setValue(e.target.value)
    valueRef.current = e.target.value
  }

  // Delay focus + outside-click activation so Radix focus-restoration finishes first
  useEffect(() => {
    const t1 = setTimeout(() => inputRef.current?.focus(), 80)
    const t2 = setTimeout(() => { readyRef.current = true }, 150)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [])

  // Document mousedown to detect "click outside" (replaces onBlur)
  useEffect(() => {
    function handleMousedown(e: MouseEvent) {
      if (!readyRef.current) return
      if (inputRef.current && !inputRef.current.contains(e.target as Node)) {
        if (doneRef.current) return
        doneRef.current = true
        const trimmed = valueRef.current.trim()
        if (trimmed) onCommit(trimmed, false)
        else onDiscard()
      }
    }
    document.addEventListener("mousedown", handleMousedown)
    return () => document.removeEventListener("mousedown", handleMousedown)
  }, [onCommit, onDiscard])

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault()
      if (doneRef.current) return
      doneRef.current = true
      const trimmed = valueRef.current.trim()
      if (trimmed) onCommit(trimmed, !isHeader)
      else onDiscard()
    }
    if (e.key === "Escape") {
      e.preventDefault()
      if (doneRef.current) return
      doneRef.current = true
      onDiscard()
    }
  }

  return (
    <input
      ref={inputRef}
      className={cn(
        "h-7 w-full rounded-md border border-input bg-transparent px-3 py-1 text-xs shadow-xs outline-none",
        "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        isHeader && "font-semibold",
      )}
      placeholder={isHeader ? "Header label…" : "New item…"}
      value={value}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
    />
  )
}

// ─── Lesson Block Helpers ─────────────────────────────────────────────────────

type BlockType = "TEXT" | "YOUTUBE_VIDEO" | "YOUTUBE_PLAYLIST" | "IMAGE"

interface LessonBlock {
  id: string
  type: BlockType
  value: string
}

function blockUid() {
  return Math.random().toString(36).slice(2)
}

function parseLessonBlocks(content: string): LessonBlock[] {
  try {
    const parsed = JSON.parse(content)
    if (Array.isArray(parsed)) return parsed
  } catch {}
  if (content.trim()) return [{ id: blockUid(), type: "TEXT", value: content }]
  return []
}

function isEmptyHtml(html: string) {
  return !html || html.replace(/<[^>]*>/g, "").trim() === ""
}

function extractYouTubeVideoId(url: string): string | null {
  try {
    const u = new URL(url)
    if (u.hostname === "youtu.be") return u.pathname.slice(1)
    return u.searchParams.get("v")
  } catch { return null }
}

function extractYouTubePlaylistId(url: string): string | null {
  try { return new URL(url).searchParams.get("list") }
  catch { return null }
}

/** Read-only render of a single block — blends seamlessly into the lesson */
function BlockRender({ type, value }: { type: BlockType; value: string }) {
  if (type === "TEXT") {
    if (isEmptyHtml(value)) return null
    const html = value.startsWith("<") ? value : `<p>${value}</p>`
    return <div className="lesson-content" dangerouslySetInnerHTML={{ __html: html }} />
  }
  if (type === "YOUTUBE_VIDEO") {
    const videoId = extractYouTubeVideoId(value)
    if (!videoId) return value ? <p className="text-xs text-destructive">Invalid YouTube URL</p> : null
    return (
      <div className="aspect-video w-full rounded-md overflow-hidden bg-black">
        <iframe
          src={`https://www.youtube.com/embed/${videoId}`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen className="w-full h-full"
        />
      </div>
    )
  }
  if (type === "YOUTUBE_PLAYLIST") {
    const listId = extractYouTubePlaylistId(value)
    if (!listId) return value ? <p className="text-xs text-destructive">Invalid playlist URL</p> : null
    return (
      <div className="aspect-video w-full rounded-md overflow-hidden bg-black">
        <iframe
          src={`https://www.youtube.com/embed/videoseries?list=${listId}`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen className="w-full h-full"
        />
      </div>
    )
  }
  if (type === "IMAGE" && value) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={value} alt="" className="w-full rounded-md object-contain max-h-[400px]" />
    )
  }
  return null
}

/** TipTap rich text editor for TEXT blocks */
function RichTextEditor({
  initialContent,
  onChange,
}: {
  initialContent: string
  onChange: (html: string) => void
}) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      TiptapUnderline,
      TiptapPlaceholder.configure({ placeholder: "Write content…" }),
    ],
    content: initialContent || "",
    editorProps: { attributes: { class: "lesson-rte focus:outline-none min-h-[80px] px-1" } },
    onUpdate({ editor }) { onChange(editor.getHTML()) },
  })

  const btn = (active: boolean) =>
    cn(
      "flex items-center justify-center h-6 w-6 rounded text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors",
      active && "bg-accent text-accent-foreground"
    )

  return (
    <div className="border rounded-md overflow-hidden bg-background">
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 px-1.5 py-1 border-b bg-muted/30 flex-wrap">
        <button type="button" className={btn(editor?.isActive("heading", { level: 1 }) ?? false)} onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()} title="Heading 1">
          <Heading1 className="h-3.5 w-3.5" />
        </button>
        <button type="button" className={btn(editor?.isActive("heading", { level: 2 }) ?? false)} onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} title="Heading 2">
          <Heading2 className="h-3.5 w-3.5" />
        </button>
        <button type="button" className={btn(editor?.isActive("heading", { level: 3 }) ?? false)} onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()} title="Heading 3">
          <Heading3 className="h-3.5 w-3.5" />
        </button>
        <div className="w-px h-4 bg-border mx-0.5" />
        <button type="button" className={btn(editor?.isActive("bold") ?? false)} onClick={() => editor?.chain().focus().toggleBold().run()} title="Bold">
          <Bold className="h-3.5 w-3.5" />
        </button>
        <button type="button" className={btn(editor?.isActive("italic") ?? false)} onClick={() => editor?.chain().focus().toggleItalic().run()} title="Italic">
          <Italic className="h-3.5 w-3.5" />
        </button>
        <button type="button" className={btn(editor?.isActive("underline") ?? false)} onClick={() => editor?.chain().focus().toggleUnderline().run()} title="Underline">
          <UnderlineIcon className="h-3.5 w-3.5" />
        </button>
        <button type="button" className={btn(editor?.isActive("strike") ?? false)} onClick={() => editor?.chain().focus().toggleStrike().run()} title="Strikethrough">
          <Strikethrough className="h-3.5 w-3.5" />
        </button>
        <div className="w-px h-4 bg-border mx-0.5" />
        <button type="button" className={btn(editor?.isActive("bulletList") ?? false)} onClick={() => editor?.chain().focus().toggleBulletList().run()} title="Bullet list">
          <List className="h-3.5 w-3.5" />
        </button>
        <button type="button" className={btn(editor?.isActive("orderedList") ?? false)} onClick={() => editor?.chain().focus().toggleOrderedList().run()} title="Numbered list">
          <ListOrdered className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="p-2">
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}

/** A single sortable content block — view mode blends in, edit mode reveals editor */
function SortableBlock({
  block,
  onChange,
  onDelete,
}: {
  block: LessonBlock
  onChange: (value: string) => void
  onDelete: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id })
  // New empty blocks start in edit mode; existing blocks start in view mode
  const [isEditing, setIsEditing] = useState(block.value === "")
  const [localValue, setLocalValue] = useState(block.value)
  const urlInputRef = useRef<HTMLInputElement>(null)

  function handleDone() {
    if (localValue !== block.value) onChange(localValue)
    setIsEditing(false)
  }

  function handleEdit() {
    setIsEditing(true)
    if (block.type !== "TEXT") {
      setTimeout(() => urlInputRef.current?.focus(), 0)
    }
  }

  const isEmpty = block.type === "TEXT" ? isEmptyHtml(localValue) : !localValue

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(isDragging && "opacity-50")}
    >
      {isEditing ? (
        /* ── Edit mode ── */
        <div className="rounded-md border bg-muted/20 p-3 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              {block.type === "TEXT" && <><FileText className="h-3.5 w-3.5" /> Text</>}
              {block.type === "YOUTUBE_VIDEO" && <><Youtube className="h-3.5 w-3.5 text-red-500" /> YouTube Video</>}
              {block.type === "YOUTUBE_PLAYLIST" && <><ListVideo className="h-3.5 w-3.5 text-red-500" /> YouTube Playlist</>}
              {block.type === "IMAGE" && <><ImageIcon className="h-3.5 w-3.5 text-blue-500" /> Image</>}
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-destructive"
                onClick={onDelete}
                title="Delete block"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
              <Button size="sm" className="h-6 text-xs px-2" onClick={handleDone}>
                Done
              </Button>
            </div>
          </div>

          {block.type === "TEXT" && (
            <RichTextEditor
              key={block.id}
              initialContent={localValue}
              onChange={setLocalValue}
            />
          )}

          {(block.type === "YOUTUBE_VIDEO" || block.type === "YOUTUBE_PLAYLIST") && (
            <div className="space-y-2">
              <Input
                ref={urlInputRef}
                value={localValue}
                onChange={(e) => setLocalValue(e.target.value)}
                placeholder={block.type === "YOUTUBE_VIDEO" ? "https://www.youtube.com/watch?v=…" : "https://www.youtube.com/playlist?list=…"}
                className="text-sm h-8"
                onKeyDown={(e) => e.key === "Enter" && handleDone()}
              />
              {localValue && <BlockRender type={block.type} value={localValue} />}
            </div>
          )}

          {block.type === "IMAGE" && (
            <div className="space-y-2">
              <Input
                ref={urlInputRef}
                value={localValue}
                onChange={(e) => setLocalValue(e.target.value)}
                placeholder="Image URL…"
                className="text-sm h-8"
                onKeyDown={(e) => e.key === "Enter" && handleDone()}
              />
              {localValue && <BlockRender type={block.type} value={localValue} />}
            </div>
          )}
        </div>
      ) : (
        /* ── View mode — content blends into the lesson, controls on hover ── */
        <div className="group relative">
          {isEmpty ? (
            <p className="text-sm text-muted-foreground italic">Empty block</p>
          ) : (
            <BlockRender type={block.type} value={localValue} />
          )}
          {/* Hover action bar */}
          <div className="absolute top-0 right-0 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity bg-background/90 border rounded-md shadow-sm px-0.5 py-0.5">
            <button
              className="flex items-center justify-center h-6 w-6 rounded text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing"
              title="Drag to reorder"
              {...attributes}
              {...listeners}
            >
              <GripVertical className="h-3.5 w-3.5" />
            </button>
            <button
              className="flex items-center justify-center h-6 w-6 rounded text-muted-foreground hover:text-foreground"
              title="Edit"
              onClick={handleEdit}
            >
              <Edit2 className="h-3.5 w-3.5" />
            </button>
            <button
              className="flex items-center justify-center h-6 w-6 rounded text-muted-foreground hover:text-destructive"
              title="Delete"
              onClick={onDelete}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/** Drag-and-drop block editor for leaders */
function LessonBlockEditor({
  blocks,
  onChange,
}: {
  blocks: LessonBlock[]
  onChange: (blocks: LessonBlock[]) => void
}) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  function addBlock(type: BlockType) {
    onChange([...blocks, { id: blockUid(), type, value: "" }])
  }

  function updateBlock(id: string, value: string) {
    onChange(blocks.map((b) => (b.id === id ? { ...b, value } : b)))
  }

  function deleteBlock(id: string) {
    onChange(blocks.filter((b) => b.id !== id))
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = blocks.findIndex((b) => b.id === active.id)
    const newIndex = blocks.findIndex((b) => b.id === over.id)
    onChange(arrayMove(blocks, oldIndex, newIndex))
  }

  return (
    <div className="space-y-2">
      {blocks.length > 0 && (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-3">
              {blocks.map((block) => (
                <SortableBlock
                  key={block.id}
                  block={block}
                  onChange={(value) => updateBlock(block.id, value)}
                  onDelete={() => deleteBlock(block.id)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
      <div className="flex gap-1.5 flex-wrap pt-1">
        <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => addBlock("TEXT")}>
          <FileText className="h-3 w-3" /> Text
        </Button>
        <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => addBlock("YOUTUBE_VIDEO")}>
          <Youtube className="h-3 w-3" /> YouTube
        </Button>
        <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => addBlock("YOUTUBE_PLAYLIST")}>
          <ListVideo className="h-3 w-3" /> Playlist
        </Button>
        <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => addBlock("IMAGE")}>
          <ImageIcon className="h-3 w-3" /> Image
        </Button>
      </div>
    </div>
  )
}

/** Read-only block viewer for non-leader members */
function LessonBlockViewer({ blocks }: { blocks: LessonBlock[] }) {
  if (blocks.length === 0) return null
  return (
    <div className="space-y-3">
      {blocks.map((block) => (
        <BlockRender key={block.id} type={block.type} value={block.value} />
      ))}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function TeamDashboard({ team: init, serviceHistory, userRole, currentUserId, allChannels }: TeamDashboardProps) {
  const [team, setTeam] = useState(init)
  const isLeader = userRole === "ADMIN" || userRole === "LEADER"
  const isAdmin = userRole === "ADMIN"
  const router = useRouter()
  const searchParams = useSearchParams()
  const defaultTab = searchParams.get("tab") ?? "overview"
  const [showSettings, setShowSettings] = useState(false)
  const channel = team.channels?.[0] ?? null

  // ── Overview: inline edit team name/desc ─────────────────────────────────

  const [imageUrl, setImageUrl] = useState(init.imageUrl ?? "")
  const [focalX, setFocalX] = useState(init.imageFocalX ?? 0.5)
  const [focalY, setFocalY] = useState(init.imageFocalY ?? 0.5)
  const [uploading, setUploading] = useState(false)
  const [showImageSettings, setShowImageSettings] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function uploadTeamImage(file: File) {
    setUploading(true)
    const fd = new FormData(); fd.append("file", file)
    const res = await fetch("/api/uploads", { method: "POST", body: fd })
    setUploading(false)
    if (res.ok) {
      const { url } = await res.json()
      setImageUrl(url)
      await patchTeamImage(url, focalX, focalY)
    } else { toast.error("Upload failed") }
  }

  async function patchTeamImage(url: string, fx: number, fy: number) {
    await fetch(`/api/teams/${team.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageUrl: url || null, imageFocalX: url ? fx : null, imageFocalY: url ? fy : null }),
    })
  }

  async function deleteTeam() {
    if (!confirm(`Delete "${team.name}"? This cannot be undone.`)) return
    const res = await fetch(`/api/teams/${team.id}`, { method: "DELETE" })
    if (res.ok) {
      toast.success("Team deleted")
      router.push("/mychurch/teams")
    } else {
      toast.error("Failed to delete team")
    }
  }

  async function archiveTeam() {
    const isArchived = !!team.archivedAt
    const res = await fetch(`/api/teams/${team.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archivedAt: isArchived ? null : new Date().toISOString() }),
    })
    if (res.ok) {
      setTeam((prev) => ({ ...prev, archivedAt: isArchived ? null : new Date().toISOString() }))
      toast.success(isArchived ? "Team restored" : "Team archived")
      if (!isArchived) router.push("/mychurch/teams")
    } else { toast.error("Failed to update team") }
  }

  async function patchTeam(data: { name?: string; description?: string }) {
    const res = await fetch(`/api/teams/${team.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    if (res.ok) {
      const updated = await res.json()
      setTeam((prev) => ({ ...prev, ...updated }))
      toast.success("Team updated")
    } else {
      toast.error("Failed to update team")
    }
  }

  // ── Compute analytics ─────────────────────────────────────────────────────

  const totalServicesServed = serviceHistory.length
  const recentServices = [...serviceHistory]
    .sort((a, b) => new Date(b.serviceTeam.service.date).getTime() - new Date(a.serviceTeam.service.date).getTime())
    .slice(0, 10)

  // ── Add member state ──────────────────────────────────────────────────────

  const [addMemberQuery, setAddMemberQuery] = useState("")
  const [addMemberResults, setAddMemberResults] = useState<{ id: string; name: string; email: string }[]>([])
  const [addMemberSearching, setAddMemberSearching] = useState(false)

  async function searchUsersToAdd(q: string) {
    setAddMemberQuery(q)
    if (!q.trim()) { setAddMemberResults([]); return }
    setAddMemberSearching(true)
    try {
      const res = await fetch(`/api/users?search=${encodeURIComponent(q)}&limit=8`)
      if (!res.ok) return
      const users = await res.json()
      const existingIds = new Set(team.members.map((m) => m.user.id))
      setAddMemberResults((users as { id: string; name: string; email: string }[]).filter((u) => !existingIds.has(u.id)))
    } catch {
      setAddMemberResults([])
    } finally {
      setAddMemberSearching(false)
    }
  }

  async function addMember(userId: string) {
    const res = await fetch("/api/team-members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teamId: team.id, userId }),
    })
    if (!res.ok) { toast.error("Failed to add member"); return }
    const user = addMemberResults.find((u) => u.id === userId)
    if (user) {
      setTeam((prev) => ({
        ...prev,
        members: [...prev.members, { id: "", isLeader: false, memberRoles: [], user: { id: user.id, name: user.name, email: user.email, avatar: null } }],
      }))
    }
    setAddMemberQuery("")
    setAddMemberResults([])
    toast.success("Member added")
  }

  async function removeMember(userId: string) {
    if (!confirm("Remove this member from the team?")) return
    const res = await fetch(`/api/team-members/${team.id}/${userId}`, { method: "DELETE" })
    if (!res.ok) { toast.error("Failed to remove member"); return }
    setTeam((prev) => ({ ...prev, members: prev.members.filter((m) => m.user.id !== userId) }))
    toast.success("Member removed")
  }

  async function saveMemberRoles(userId: string, roleIds: string[]) {
    const res = await fetch(`/api/team-members/${team.id}/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roleIds }),
    })
    if (!res.ok) { toast.error("Failed to save roles"); return }
    setTeam((prev) => ({
      ...prev,
      members: prev.members.map((m) =>
        m.user.id === userId ? { ...m, memberRoles: roleIds.map((id) => ({ roleId: id })) } : m
      ),
    }))
    toast.success("Roles updated")
  }

  // ── Role management ───────────────────────────────────────────────────────

  const [newRoleName, setNewRoleName] = useState("")
  const [addingRole, setAddingRole] = useState(false)

  async function addRole() {
    const name = newRoleName.trim()
    if (!name) return
    setAddingRole(true)
    const res = await fetch("/api/roles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teamId: team.id, name }),
    })
    if (res.ok) {
      const role = await res.json()
      setTeam((prev) => ({ ...prev, roles: [...prev.roles, role] }))
      setNewRoleName("")
      toast.success("Role added")
    } else {
      toast.error("Failed to add role")
    }
    setAddingRole(false)
  }

  async function deleteRole(roleId: string) {
    if (!confirm("Delete this role? Members assigned to it will be unassigned.")) return
    const res = await fetch(`/api/roles/${roleId}`, { method: "DELETE" })
    if (res.ok) {
      setTeam((prev) => ({
        ...prev,
        roles: prev.roles.filter((r) => r.id !== roleId),
        members: prev.members.map((m) => ({
          ...m,
          memberRoles: m.memberRoles.filter((mr) => mr.roleId !== roleId),
        })),
      }))
      toast.success("Role deleted")
    } else {
      toast.error("Failed to delete role")
    }
  }

  // ── Notes state ───────────────────────────────────────────────────────────

  const [notes, setNotes] = useState<TeamNote[]>(init.notes)
  const [expandedMemberNotes, setExpandedMemberNotes] = useState<Record<string, boolean>>({})
  const [newNoteContent, setNewNoteContent] = useState<Record<string, string>>({})

  function toggleMemberNotes(memberId: string) {
    setExpandedMemberNotes((prev) => ({ ...prev, [memberId]: !prev[memberId] }))
  }

  async function addNote(subjectId: string) {
    const content = newNoteContent[subjectId]?.trim()
    if (!content) return
    const res = await fetch(`/api/teams/${team.id}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subjectId, content }),
    })
    if (res.ok) {
      const note = await res.json()
      setNotes((prev) => [note, ...prev])
      setNewNoteContent((prev) => ({ ...prev, [subjectId]: "" }))
      toast.success("Note added")
    } else {
      toast.error("Failed to add note")
    }
  }

  async function deleteNote(noteId: string) {
    const res = await fetch(`/api/teams/${team.id}/notes/${noteId}`, { method: "DELETE" })
    if (res.ok) {
      setNotes((prev) => prev.filter((n) => n.id !== noteId))
      toast.success("Note deleted")
    } else {
      toast.error("Failed to delete note")
    }
  }

  // ── Projects & Tasks state (now managed by ProjectBoard component) ──────────

  const allOpenTasks = [
    ...init.tasks.filter((t) => !t.done),
    ...init.projects.flatMap((p) => p.tasks.filter((t) => !t.done)),
  ]

  // ── Training state ────────────────────────────────────────────────────────

  const [modules, setModules] = useState<TrainingModule[]>(init.trainingModules)
  const [newModuleTitle, setNewModuleTitle] = useState("")
  const [newLessonTitles, setNewLessonTitles] = useState<Record<string, string>>({})

  // ── Checklist template state ──────────────────────────────────────────────
  const [checklists, setChecklists] = useState<TeamChecklistType[]>(init.checklists ?? [])
  const [newChecklistName, setNewChecklistName] = useState("")
  const [addingItem, setAddingItem] = useState<Record<string, { isHeader: boolean; key: number } | null>>({})

  async function addChecklist() {
    if (!newChecklistName.trim()) return
    const res = await fetch(`/api/teams/${team.id}/checklists`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newChecklistName }),
    })
    if (res.ok) {
      const cl = await res.json()
      setChecklists((prev) => [...prev, cl])
      setNewChecklistName("")
      toast.success("Checklist created")
    } else {
      toast.error("Failed to create checklist")
    }
  }

  async function updateChecklistName(checklistId: string, name: string) {
    const res = await fetch(`/api/teams/${team.id}/checklists/${checklistId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    })
    if (res.ok) {
      const updated = await res.json()
      setChecklists((prev) => prev.map((c) => (c.id === checklistId ? updated : c)))
      toast.success("Checklist updated")
    }
  }

  async function deleteChecklist(checklistId: string) {
    const res = await fetch(`/api/teams/${team.id}/checklists/${checklistId}`, { method: "DELETE" })
    if (res.ok) {
      setChecklists((prev) => prev.filter((c) => c.id !== checklistId))
      toast.success("Checklist deleted")
    }
  }

  async function commitPendingItem(checklistId: string, content: string, continueAdding: boolean) {
    const pending = addingItem[checklistId]
    if (!pending) return
    const res = await fetch(`/api/teams/${team.id}/checklists/${checklistId}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, isHeader: pending.isHeader }),
    })
    if (res.ok) {
      const item = await res.json()
      setChecklists((prev) =>
        prev.map((c) => (c.id === checklistId ? { ...c, items: [...c.items, item] } : c))
      )
      if (continueAdding && !pending.isHeader) {
        // Remount the input for the next task by bumping the key
        setAddingItem((prev) => ({
          ...prev,
          [checklistId]: { isHeader: false, key: (prev[checklistId]?.key ?? 0) + 1 },
        }))
      } else {
        setAddingItem((prev) => ({ ...prev, [checklistId]: null }))
      }
    } else {
      toast.error("Failed to add item")
      setAddingItem((prev) => ({ ...prev, [checklistId]: null }))
    }
  }

  async function updateChecklistItem(checklistId: string, itemId: string, content: string) {
    const res = await fetch(`/api/teams/${team.id}/checklists/${checklistId}/items/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    })
    if (res.ok) {
      const updated = await res.json()
      setChecklists((prev) =>
        prev.map((c) =>
          c.id === checklistId
            ? { ...c, items: c.items.map((i) => (i.id === itemId ? updated : i)) }
            : c
        )
      )
    }
  }

  async function updateChecklistItemRole(checklistId: string, itemId: string, roleId: string | null) {
    const res = await fetch(`/api/teams/${team.id}/checklists/${checklistId}/items/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roleId }),
    })
    if (res.ok) {
      const updated = await res.json()
      setChecklists((prev) =>
        prev.map((c) =>
          c.id === checklistId
            ? { ...c, items: c.items.map((i) => (i.id === itemId ? updated : i)) }
            : c
        )
      )
    }
  }

  async function deleteChecklistItem(checklistId: string, itemId: string) {
    const res = await fetch(`/api/teams/${team.id}/checklists/${checklistId}/items/${itemId}`, { method: "DELETE" })
    if (res.ok) {
      setChecklists((prev) =>
        prev.map((c) =>
          c.id === checklistId ? { ...c, items: c.items.filter((i) => i.id !== itemId) } : c
        )
      )
      toast.success("Item removed")
    }
  }

  async function addModule() {
    if (!newModuleTitle.trim()) return
    const res = await fetch(`/api/teams/${team.id}/training`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newModuleTitle }),
    })
    if (res.ok) {
      const mod = await res.json()
      setModules((prev) => [...prev, mod])
      setNewModuleTitle("")
      toast.success("Module added")
    } else {
      toast.error("Failed to add module")
    }
  }

  async function deleteModule(moduleId: string) {
    if (!confirm("Delete this training module and all its lessons?")) return
    const res = await fetch(`/api/teams/${team.id}/training/${moduleId}`, { method: "DELETE" })
    if (res.ok) {
      setModules((prev) => prev.filter((m) => m.id !== moduleId))
      toast.success("Module deleted")
    }
  }

  async function patchModule(moduleId: string, data: { title?: string; description?: string }) {
    const res = await fetch(`/api/teams/${team.id}/training/${moduleId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    if (res.ok) {
      const updated = await res.json()
      setModules((prev) => prev.map((m) => (m.id === moduleId ? { ...m, ...updated } : m)))
      toast.success("Module updated")
    }
  }

  async function addLesson(moduleId: string) {
    const title = newLessonTitles[moduleId]?.trim()
    if (!title) return
    const res = await fetch(`/api/teams/${team.id}/training/${moduleId}/steps`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, content: "[]" }),
    })
    if (res.ok) {
      const step = await res.json()
      setModules((prev) =>
        prev.map((m) => (m.id === moduleId ? { ...m, steps: [...m.steps, step] } : m))
      )
      setNewLessonTitles((prev) => ({ ...prev, [moduleId]: "" }))
      toast.success("Lesson added")
    } else {
      toast.error("Failed to add lesson")
    }
  }

  async function deleteStep(moduleId: string, stepId: string) {
    const res = await fetch(`/api/teams/${team.id}/training/${moduleId}/steps/${stepId}`, { method: "DELETE" })
    if (res.ok) {
      setModules((prev) =>
        prev.map((m) =>
          m.id === moduleId ? { ...m, steps: m.steps.filter((s) => s.id !== stepId) } : m
        )
      )
      toast.success("Lesson deleted")
    }
  }

  async function patchStep(moduleId: string, stepId: string, data: { title?: string; content?: string }, opts?: { silent?: boolean }) {
    const res = await fetch(`/api/teams/${team.id}/training/${moduleId}/steps/${stepId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    if (res.ok) {
      const updated = await res.json()
      setModules((prev) =>
        prev.map((m) =>
          m.id === moduleId
            ? { ...m, steps: m.steps.map((s) => (s.id === stepId ? { ...s, ...updated } : s)) }
            : m
        )
      )
      if (!opts?.silent) toast.success("Lesson updated")
    }
  }

  async function toggleStepCompletion(moduleId: string, stepId: string) {
    const res = await fetch(`/api/teams/${team.id}/training/${moduleId}/steps/${stepId}/complete`, {
      method: "POST",
    })
    if (res.ok) {
      const { completed } = await res.json()
      setModules((prev) =>
        prev.map((m) =>
          m.id === moduleId
            ? {
                ...m,
                steps: m.steps.map((s) => {
                  if (s.id !== stepId) return s
                  if (completed) {
                    return { ...s, completions: [...s.completions, { userId: currentUserId }] }
                  } else {
                    return { ...s, completions: s.completions.filter((c) => c.userId !== currentUserId) }
                  }
                }),
              }
            : m
        )
      )
    }
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header — hero if image, plain text if not */}
      {imageUrl ? (
        <div className="-mx-6 -mt-6">
          <div className="relative h-44 sm:h-56 overflow-hidden">
            <img
              src={imageUrl}
              alt={team.name}
              className="w-full h-full object-cover"
              style={{ objectPosition: `${focalX * 100}% ${focalY * 100}%` }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
            <div className="absolute top-3 right-3 flex gap-2">
              <Link href="/mychurch/teams">
                <Button size="sm" variant="secondary" className="shadow-md gap-1">
                  <ArrowLeft className="h-4 w-4" /> Teams
                </Button>
              </Link>
              {channel && (
                <Link href={`/mychurch/chat/${channel.id}`}>
                  <Button size="sm" variant="secondary" className="shadow-md">
                    <MessageSquare className="h-4 w-4 mr-1.5" /> Go to Chat
                  </Button>
                </Link>
              )}
              {isLeader && (
                <Button size="sm" variant="secondary" className="shadow-md" onClick={() => setShowSettings(true)}>
                  <Settings className="h-4 w-4 mr-1.5" /> Settings
                </Button>
              )}
            </div>
            <div className="absolute bottom-0 left-0 right-0 px-6 pb-4 text-white">
              <h1 className="text-2xl sm:text-3xl font-bold leading-tight drop-shadow">{team.name}</h1>
              {team.members.some((m) => m.isLeader) && (
                <p className="text-sm text-white/70 mt-0.5">
                  {team.members.filter((m) => m.isLeader).map((m) => m.user.name).join(", ")}
                </p>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <Link href="/mychurch/teams">
                <Button variant="ghost" size="sm" className="gap-1 -ml-2">
                  <ArrowLeft className="h-4 w-4" /> Teams
                </Button>
              </Link>
            </div>
            <h1 className="text-2xl font-bold">{team.name}</h1>
            {team.members.some((m) => m.isLeader) && (
              <p className="text-sm text-muted-foreground mt-0.5">
                {team.members.filter((m) => m.isLeader).map((m) => m.user.name).join(", ")}
              </p>
            )}
          </div>
          <div className="flex gap-2 shrink-0 pt-1">
            {channel && (
              <Link href={`/mychurch/chat/${channel.id}`}>
                <Button size="sm" variant="outline">
                  <MessageSquare className="h-4 w-4 mr-1.5" /> Go to Chat
                </Button>
              </Link>
            )}
            {isLeader && (
              <Button size="sm" variant="outline" onClick={() => setShowSettings(true)}>
                <Settings className="h-4 w-4 mr-1.5" /> Settings
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Description */}
      <p className="text-muted-foreground">
        {isLeader ? (
          <InlineEdit
            value={team.description ?? ""}
            onSave={(description) => patchTeam({ description })}
            placeholder="Add a team description…"
            multiline
          />
        ) : (
          team.description || <span className="italic">No description</span>
        )}
      </p>

      <Tabs defaultValue={defaultTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="members">Members &amp; Roles</TabsTrigger>
          <TabsTrigger value="tasks">Projects &amp; Tasks</TabsTrigger>
          <TabsTrigger value="training">Training</TabsTrigger>
          <TabsTrigger value="checklist">Checklist</TabsTrigger>
        </TabsList>

        {/* ── Overview Tab ─────────────────────────────────────────────────── */}
        <TabsContent value="overview" className="space-y-6 mt-4">
          {/* Stat cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-2xl font-bold">{team.members.length}</p>
                    <p className="text-xs text-muted-foreground">Members</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-2xl font-bold">{team.roles.length}</p>
                    <p className="text-xs text-muted-foreground">Roles</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-2xl font-bold">{totalServicesServed}</p>
                    <p className="text-xs text-muted-foreground">Services Served</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <ClipboardList className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-2xl font-bold">{allOpenTasks.length}</p>
                    <p className="text-xs text-muted-foreground">Open Tasks</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent services table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent Services</CardTitle>
            </CardHeader>
            <CardContent>
              {recentServices.length === 0 ? (
                <p className="text-sm text-muted-foreground">No service history yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-muted-foreground text-xs">
                        <th className="text-left pb-2 pr-4">Date</th>
                        <th className="text-left pb-2 pr-4">Service</th>
                        <th className="text-left pb-2 pr-4">Role</th>
                        <th className="text-left pb-2">Member</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentServices.map((s, i) => {
                        const member = team.members.find((m) => m.user.id === s.userId)
                        return (
                          <tr key={i} className="border-b last:border-0">
                            <td className="py-2 pr-4 whitespace-nowrap">
                              {formatDate(s.serviceTeam.service.date)}
                            </td>
                            <td className="py-2 pr-4">
                              {s.serviceTeam.service.title || s.serviceTeam.service.category?.name || "Service"}
                            </td>
                            <td className="py-2 pr-4">
                              <Badge variant="secondary" className="text-xs">
                                {s.role.name}
                              </Badge>
                            </td>
                            <td className="py-2">
                              {member?.user.name ?? <span className="text-muted-foreground italic">Unknown</span>}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Checklist Completion Widget */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Checklist Completion</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ChecklistWidget teamId={team.id} />
            </CardContent>
          </Card>

          {/* Pinned Links */}
          {channel && (
            <ChannelLinksCard channelId={channel.id} canManage={isLeader} />
          )}
        </TabsContent>

        {/* ── Members & Roles Tab ──────────────────────────────────────────── */}
        <TabsContent value="members" className="space-y-6 mt-4">

          {/* Top bar: Add Member + Manage Roles */}
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Add Member */}
            {isAdmin && (
              <div className="relative flex-1">
                <div className="flex gap-2 items-center">
                  <Input
                    placeholder="Search users to add…"
                    value={addMemberQuery}
                    onChange={(e) => searchUsersToAdd(e.target.value)}
                    className="max-w-sm"
                  />
                  {addMemberSearching && <span className="text-xs text-muted-foreground">Searching…</span>}
                </div>
                {addMemberResults.length > 0 && (
                  <div className="absolute top-full left-0 mt-1 w-72 bg-card border rounded-md shadow-lg z-20 max-h-48 overflow-y-auto">
                    {addMemberResults.map((u) => (
                      <button
                        key={u.id}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-accent/50 flex items-center gap-2"
                        onClick={() => addMember(u.id)}
                      >
                        <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium shrink-0">
                          {initials(u.name)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium truncate">{u.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Roles management */}
          {isAdmin && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Roles</p>
              <div className="flex flex-wrap items-center gap-2">
                {team.roles.map((role) => (
                  <div
                    key={role.id}
                    className="flex items-center gap-1.5 bg-muted rounded-full px-3 py-1 text-sm"
                  >
                    <span>{role.name}</span>
                    <button
                      onClick={() => deleteRole(role.id)}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                      title="Delete role"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                <div className="flex items-center gap-1">
                  <Input
                    placeholder="New role…"
                    value={newRoleName}
                    onChange={(e) => setNewRoleName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addRole()}
                    className="h-7 text-sm w-32"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs gap-1"
                    onClick={addRole}
                    disabled={addingRole || !newRoleName.trim()}
                  >
                    <Plus className="h-3 w-3" /> Add
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Members grouped by role — columns */}
          {team.members.length === 0 ? (
            <p className="text-muted-foreground text-sm">No members on this team yet.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 items-start">
              {/* One column per role */}
              {team.roles.map((role) => {
                const roleMembers = team.members.filter((m) =>
                  m.memberRoles.some((mr) => mr.roleId === role.id)
                )
                return (
                  <div key={role.id} className="space-y-2">
                    <div className="flex items-center gap-2 pb-1 border-b">
                      <h3 className="text-sm font-semibold">{role.name}</h3>
                      <span className="text-xs text-muted-foreground">{roleMembers.length}</span>
                    </div>
                    {roleMembers.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic px-1">No members</p>
                    ) : (
                      roleMembers.map((member) => {
                        const memberNotes = notes.filter((n) => n.subjectId === member.user.id)
                        const isExpanded = expandedMemberNotes[member.user.id] ?? false
                        return (
                          <Card key={member.user.id} className="overflow-hidden">
                            <CardContent className="p-3">
                              <div className="flex items-start gap-2">
                                <Avatar className="h-8 w-8 shrink-0">
                                  {member.user.avatar ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={member.user.avatar} alt={member.user.name} className="h-8 w-8 rounded-full object-cover" />
                                  ) : (
                                    <AvatarFallback className="text-xs">{initials(member.user.name)}</AvatarFallback>
                                  )}
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1 flex-wrap">
                                    <p className="text-sm font-medium truncate">{member.user.name}</p>
                                    {member.isLeader && (
                                      <span className="text-[10px] text-muted-foreground border rounded px-1 py-0.5 leading-none">Leader</span>
                                    )}
                                  </div>
                                  <p className="text-xs text-muted-foreground truncate">{member.user.email}</p>
                                  {/* All roles for this member */}
                                  {team.roles.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-1.5">
                                      {team.roles.map((r) => {
                                        const assigned = member.memberRoles.some((mr) => mr.roleId === r.id)
                                        if (!isAdmin && !assigned) return null
                                        return (
                                          <button
                                            key={r.id}
                                            disabled={!isAdmin}
                                            onClick={() => {
                                              if (!isAdmin) return
                                              const currentIds = member.memberRoles.map((mr) => mr.roleId)
                                              const newIds = assigned
                                                ? currentIds.filter((id) => id !== r.id)
                                                : [...currentIds, r.id]
                                              saveMemberRoles(member.user.id, newIds)
                                            }}
                                            className={`text-[10px] px-1.5 py-0.5 rounded-full border transition-colors leading-none ${
                                              assigned
                                                ? "bg-primary text-primary-foreground border-primary"
                                                : "bg-background text-muted-foreground border-border hover:border-primary/50"
                                            } ${!isAdmin ? "cursor-default" : ""}`}
                                          >
                                            {r.name}
                                          </button>
                                        )
                                      })}
                                    </div>
                                  )}
                                </div>
                                {isAdmin && (
                                  <div className="flex flex-col gap-0.5 shrink-0">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6 text-destructive hover:text-destructive"
                                      title="Remove from team"
                                      onClick={() => removeMember(member.user.id)}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                )}
                              </div>
                              {/* Notes toggle */}
                              {isLeader && (
                                <button
                                  className="mt-2 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                                  onClick={() => toggleMemberNotes(member.user.id)}
                                >
                                  Notes ({memberNotes.length})
                                  {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                                </button>
                              )}
                              {isExpanded && (
                                <div className="mt-2 space-y-2 border-t pt-2">
                                  {memberNotes.length === 0 && (
                                    <p className="text-xs text-muted-foreground italic">No notes yet.</p>
                                  )}
                                  {memberNotes.map((note) => (
                                    <div key={note.id} className="bg-muted rounded p-2 text-xs">
                                      <div className="flex items-start justify-between gap-1">
                                        <p>{note.content}</p>
                                        {(note.authorId === currentUserId || userRole === "ADMIN") && (
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-5 w-5 shrink-0 text-destructive"
                                            onClick={() => deleteNote(note.id)}
                                          >
                                            <Trash2 className="h-3 w-3" />
                                          </Button>
                                        )}
                                      </div>
                                      <p className="text-muted-foreground mt-0.5">
                                        {note.author.name} · {formatDate(note.createdAt)}
                                      </p>
                                    </div>
                                  ))}
                                  {isLeader && (
                                    <div className="flex gap-1">
                                      <Textarea
                                        placeholder="Add a note…"
                                        className="min-h-[50px] text-xs"
                                        value={newNoteContent[member.user.id] ?? ""}
                                        onChange={(e) =>
                                          setNewNoteContent((prev) => ({ ...prev, [member.user.id]: e.target.value }))
                                        }
                                      />
                                      <Button
                                        size="sm"
                                        className="self-end text-xs h-7"
                                        onClick={() => addNote(member.user.id)}
                                      >
                                        Add
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        )
                      })
                    )}
                  </div>
                )
              })}

              {/* Unassigned column — members with no roles */}
              {(() => {
                const unassigned = team.members.filter((m) => m.memberRoles.length === 0)
                if (unassigned.length === 0 && team.roles.length > 0) return null
                return (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 pb-1 border-b">
                      <h3 className="text-sm font-semibold text-muted-foreground">Unassigned</h3>
                      <span className="text-xs text-muted-foreground">{unassigned.length}</span>
                    </div>
                    {unassigned.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic px-1">No unassigned members</p>
                    ) : (
                      unassigned.map((member) => {
                        const memberNotes = notes.filter((n) => n.subjectId === member.user.id)
                        const isExpanded = expandedMemberNotes[member.user.id] ?? false
                        return (
                          <Card key={member.user.id} className="overflow-hidden">
                            <CardContent className="p-3">
                              <div className="flex items-start gap-2">
                                <Avatar className="h-8 w-8 shrink-0">
                                  {member.user.avatar ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={member.user.avatar} alt={member.user.name} className="h-8 w-8 rounded-full object-cover" />
                                  ) : (
                                    <AvatarFallback className="text-xs">{initials(member.user.name)}</AvatarFallback>
                                  )}
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1 flex-wrap">
                                    <p className="text-sm font-medium truncate">{member.user.name}</p>
                                    {member.isLeader && (
                                      <span className="text-[10px] text-muted-foreground border rounded px-1 py-0.5 leading-none">Leader</span>
                                    )}
                                  </div>
                                  <p className="text-xs text-muted-foreground truncate">{member.user.email}</p>
                                  {isAdmin && team.roles.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-1.5">
                                      {team.roles.map((r) => (
                                        <button
                                          key={r.id}
                                          onClick={() => saveMemberRoles(member.user.id, [r.id])}
                                          className="text-[10px] px-1.5 py-0.5 rounded-full border border-border text-muted-foreground hover:border-primary/50 transition-colors leading-none bg-background"
                                        >
                                          {r.name}
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </div>
                                {isAdmin && (
                                  <div className="flex flex-col gap-0.5 shrink-0">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6 text-destructive hover:text-destructive"
                                      title="Remove from team"
                                      onClick={() => removeMember(member.user.id)}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                )}
                              </div>
                              {isLeader && (
                                <button
                                  className="mt-2 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                                  onClick={() => toggleMemberNotes(member.user.id)}
                                >
                                  Notes ({memberNotes.length})
                                  {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                                </button>
                              )}
                              {isExpanded && (
                                <div className="mt-2 space-y-2 border-t pt-2">
                                  {memberNotes.length === 0 && (
                                    <p className="text-xs text-muted-foreground italic">No notes yet.</p>
                                  )}
                                  {memberNotes.map((note) => (
                                    <div key={note.id} className="bg-muted rounded p-2 text-xs">
                                      <div className="flex items-start justify-between gap-1">
                                        <p>{note.content}</p>
                                        {(note.authorId === currentUserId || userRole === "ADMIN") && (
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-5 w-5 shrink-0 text-destructive"
                                            onClick={() => deleteNote(note.id)}
                                          >
                                            <Trash2 className="h-3 w-3" />
                                          </Button>
                                        )}
                                      </div>
                                      <p className="text-muted-foreground mt-0.5">
                                        {note.author.name} · {formatDate(note.createdAt)}
                                      </p>
                                    </div>
                                  ))}
                                  {isLeader && (
                                    <div className="flex gap-1">
                                      <Textarea
                                        placeholder="Add a note…"
                                        className="min-h-[50px] text-xs"
                                        value={newNoteContent[member.user.id] ?? ""}
                                        onChange={(e) =>
                                          setNewNoteContent((prev) => ({ ...prev, [member.user.id]: e.target.value }))
                                        }
                                      />
                                      <Button
                                        size="sm"
                                        className="self-end text-xs h-7"
                                        onClick={() => addNote(member.user.id)}
                                      >
                                        Add
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        )
                      })
                    )}
                  </div>
                )
              })()}
            </div>
          )}
        </TabsContent>

        {/* ── Projects & Tasks Tab ──────────────────────────────────────────── */}
        <TabsContent value="tasks" className="mt-4">
          <ProjectBoard
            teamId={team.id}
            members={team.members}
            initialProjects={init.projects}
            initialStandalone={init.tasks}
            initialStatuses={team.taskStatuses}
            currentUserId={currentUserId}
            userRole={userRole}
          />
        </TabsContent>

        {/* ── Training Tab ──────────────────────────────────────────────────── */}
        <TabsContent value="training" className="space-y-4 mt-4">
          {modules.length === 0 && (
            <p className="text-sm text-muted-foreground">No training modules yet.</p>
          )}

          {modules.map((mod) => {
            const myCompletedLessons = mod.steps.filter((s) =>
              s.completions.some((c) => c.userId === currentUserId)
            ).length
            const totalLessons = mod.steps.length
            const progressPct = totalLessons > 0 ? Math.round((myCompletedLessons / totalLessons) * 100) : 0

            return (
              <Card key={mod.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0 space-y-1">
                      <CardTitle className="text-base">
                        {isLeader ? (
                          <InlineEdit
                            value={mod.title}
                            onSave={(title) => patchModule(mod.id, { title })}
                          />
                        ) : (
                          mod.title
                        )}
                      </CardTitle>
                      {(mod.description || isLeader) && (
                        <p className="text-sm text-muted-foreground">
                          {isLeader ? (
                            <InlineEdit
                              value={mod.description ?? ""}
                              onSave={(description) => patchModule(mod.id, { description })}
                              placeholder="Add description…"
                              multiline
                            />
                          ) : (
                            mod.description
                          )}
                        </p>
                      )}
                    </div>
                    {isLeader && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0 text-destructive"
                        onClick={() => deleteModule(mod.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  {totalLessons > 0 && (
                    <div className="space-y-1 mt-2">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Your progress</span>
                        <span>{myCompletedLessons}/{totalLessons} lessons</span>
                      </div>
                      <Progress value={progressPct} className="h-2" />
                    </div>
                  )}
                </CardHeader>

                <CardContent className="space-y-3">
                  {mod.steps.length === 0 && (
                    <p className="text-sm text-muted-foreground italic">No lessons yet.</p>
                  )}

                  {mod.steps.map((step) => {
                    const isCompletedByMe = step.completions.some((c) => c.userId === currentUserId)
                    const blocks = parseLessonBlocks(step.content)
                    return (
                      <div
                        key={step.id}
                        className={cn("border rounded-md p-3 space-y-3", isCompletedByMe && "opacity-70")}
                      >
                        {/* Lesson header row */}
                        <div className="flex items-start justify-between gap-2">
                          <p className={cn("text-sm font-medium", isCompletedByMe && "line-through text-muted-foreground")}>
                            {isLeader ? (
                              <InlineEdit
                                value={step.title}
                                onSave={(title) => patchStep(mod.id, step.id, { title })}
                              />
                            ) : (
                              step.title
                            )}
                          </p>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {/* Member completion badges (leaders only) */}
                            {isLeader && team.members.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {team.members.map((m) => {
                                  const done = step.completions.some((c) => c.userId === m.user.id)
                                  return (
                                    <span
                                      key={m.user.id}
                                      title={m.user.name}
                                      className={`text-xs px-1.5 py-0.5 rounded-full ${
                                        done
                                          ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                                          : "bg-muted text-muted-foreground"
                                      }`}
                                    >
                                      {initials(m.user.name)}
                                    </span>
                                  )
                                })}
                              </div>
                            )}
                            {isLeader && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-destructive"
                                onClick={() => deleteStep(mod.id, step.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </div>

                        {/* Block editor (leaders) or viewer (members) */}
                        {isLeader ? (
                          <LessonBlockEditor
                            blocks={blocks}
                            onChange={(newBlocks) =>
                              patchStep(mod.id, step.id, { content: JSON.stringify(newBlocks) }, { silent: true })
                            }
                          />
                        ) : (
                          <LessonBlockViewer blocks={blocks} />
                        )}

                        {/* Complete button */}
                        <div className="flex justify-end pt-1">
                          <Button
                            size="sm"
                            variant={isCompletedByMe ? "default" : "outline"}
                            className={isCompletedByMe ? "bg-green-600 hover:bg-green-700 text-white" : ""}
                            onClick={() => toggleStepCompletion(mod.id, step.id)}
                          >
                            {isCompletedByMe && <Check className="h-3.5 w-3.5 mr-1" />}
                            {isCompletedByMe ? "Completed" : "Complete"}
                          </Button>
                        </div>
                      </div>
                    )
                  })}

                  {/* Add lesson (leaders only) */}
                  {isLeader && (
                    <div className="flex gap-2 pt-1">
                      <Input
                        placeholder="New lesson title…"
                        className="h-8 text-sm"
                        value={newLessonTitles[mod.id] ?? ""}
                        onChange={(e) =>
                          setNewLessonTitles((prev) => ({ ...prev, [mod.id]: e.target.value }))
                        }
                        onKeyDown={(e) => e.key === "Enter" && addLesson(mod.id)}
                      />
                      <Button size="sm" className="h-8 shrink-0" onClick={() => addLesson(mod.id)}>
                        <Plus className="h-3.5 w-3.5 mr-1" />
                        Lesson
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}

          {/* Add module (leaders only) */}
          {isLeader && (
            <div className="flex gap-2">
              <Input
                placeholder="New module title…"
                value={newModuleTitle}
                onChange={(e) => setNewModuleTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addModule()}
              />
              <Button onClick={addModule}>
                <Plus className="h-4 w-4 mr-1" />
                Add Module
              </Button>
            </div>
          )}
        </TabsContent>

        {/* ── Checklist Tab ─────────────────────────────────────────────────── */}
        <TabsContent value="checklist" className="space-y-4 mt-4">
          <p className="text-sm text-muted-foreground">
            Named checklists whose items will be pre-populated on each service this team is assigned to. Assign items to roles so the right people see them.
          </p>

          {isLeader && (
            <div className="flex gap-2">
              <Input
                placeholder="New checklist name…"
                value={newChecklistName}
                onChange={(e) => setNewChecklistName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addChecklist()}
              />
              <Button onClick={addChecklist}>
                <Plus className="h-4 w-4 mr-1" />
                New Checklist
              </Button>
            </div>
          )}

          {checklists.length === 0 && (
            <p className="text-sm text-muted-foreground italic">No checklists yet.</p>
          )}

          {checklists.map((cl) => (
            <div key={cl.id} className="border rounded-lg bg-card">
              {/* Checklist header */}
              <div className="flex items-center gap-2 p-3 border-b">
                {isLeader ? (
                  <InlineEdit
                    value={cl.name}
                    onSave={(name) => updateChecklistName(cl.id, name)}
                  />
                ) : (
                  <span className="text-sm font-medium flex-1">{cl.name}</span>
                )}
                <span className="text-xs text-muted-foreground ml-auto">{cl.items.filter(i => !i.isHeader).length} item{cl.items.filter(i => !i.isHeader).length !== 1 ? "s" : ""}</span>
                {isLeader && (
                  <>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
                          <Plus className="h-3.5 w-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => setAddingItem((prev) => ({ ...prev, [cl.id]: { isHeader: false, key: 0 } }))}>
                          Task
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => setAddingItem((prev) => ({ ...prev, [cl.id]: { isHeader: true, key: 0 } }))}>
                          Header
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0 text-destructive"
                      onClick={() => deleteChecklist(cl.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </>
                )}
              </div>

              {/* Checklist items */}
              <div className="p-2 space-y-1">
                {cl.items.length === 0 && (
                  <p className="text-xs text-muted-foreground italic px-1">No items yet.</p>
                )}
                {cl.items.map((item) =>
                  item.isHeader ? (
                    <div key={item.id} className="flex items-center gap-2 px-1 pt-3 pb-1 group">
                      <div className="flex-1 min-w-0">
                        {isLeader ? (
                          <InlineEdit
                            value={item.content}
                            onSave={(content) => updateChecklistItem(cl.id, item.id, content)}
                          />
                        ) : (
                          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{item.content}</span>
                        )}
                      </div>
                      {isLeader && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 shrink-0 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => deleteChecklistItem(cl.id, item.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div key={item.id} className="flex items-center gap-2 px-1 py-1 rounded hover:bg-muted/50 group">
                      <div className="flex-1 min-w-0">
                        {isLeader ? (
                          <InlineEdit
                            value={item.content}
                            onSave={(content) => updateChecklistItem(cl.id, item.id, content)}
                          />
                        ) : (
                          <span className="text-sm">{item.content}</span>
                        )}
                      </div>
                      {isLeader && init.roles.length > 0 && (
                        <Select
                          value={item.roleId ?? "none"}
                          onValueChange={(val) => updateChecklistItemRole(cl.id, item.id, val === "none" ? null : val)}
                        >
                          <SelectTrigger className="h-7 w-32 text-xs">
                            <SelectValue placeholder="All roles" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">All roles</SelectItem>
                            {init.roles.map((r) => (
                              <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                      {!isLeader && item.role && (
                        <span className="text-xs text-muted-foreground">{item.role.name}</span>
                      )}
                      {isLeader && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 shrink-0 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => deleteChecklistItem(cl.id, item.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  )
                )}

                {/* Inline pending input */}
                {addingItem[cl.id] && (
                  <div className={cn("px-1 py-1", addingItem[cl.id]!.isHeader && "pt-3")}>
                    <PendingItemInput
                      key={addingItem[cl.id]!.key}
                      isHeader={addingItem[cl.id]!.isHeader}
                      onCommit={(content, continueAdding) => commitPendingItem(cl.id, content, continueAdding)}
                      onDiscard={() => setAddingItem((prev) => ({ ...prev, [cl.id]: null }))}
                    />
                  </div>
                )}
              </div>
            </div>
          ))}
        </TabsContent>
      </Tabs>

      {/* Settings Sheet */}
      {showSettings && (
        <TeamSettingsSheet
          team={team}
          allChannels={allChannels}
          imageUrl={imageUrl}
          focalX={focalX}
          focalY={focalY}
          fileRef={fileRef}
          uploading={uploading}
          onUpload={uploadTeamImage}
          onSetFocal={(x, y) => { setFocalX(x); setFocalY(y); patchTeamImage(imageUrl, x, y) }}
          onRemoveImage={() => { setImageUrl(""); patchTeamImage("", focalX, focalY) }}
          onClose={() => setShowSettings(false)}
          onUpdate={(updated) => setTeam((prev) => ({ ...prev, ...updated }))}
          isAdmin={isAdmin}
          onDelete={deleteTeam}
          onArchive={archiveTeam}
        />
      )}
    </div>
  )
}

// ── Team Settings Sheet ────────────────────────────────────────────────────

function TeamSettingsSheet({
  team, allChannels, imageUrl, focalX, focalY, fileRef, uploading,
  onUpload, onSetFocal, onRemoveImage, onClose, onUpdate, isAdmin, onDelete, onArchive,
}: {
  team: Team
  allChannels: TeamChannel[]
  imageUrl: string
  focalX: number
  focalY: number
  fileRef: React.RefObject<HTMLInputElement | null>
  uploading: boolean
  onUpload: (file: File) => void
  onSetFocal: (x: number, y: number) => void
  onRemoveImage: () => void
  onClose: () => void
  onUpdate: (updated: Partial<Team>) => void
  isAdmin: boolean
  onDelete: () => void
  onArchive: () => void
}) {
  const [name, setName] = useState(team.name)
  const [description, setDescription] = useState(team.description ?? "")
  const [linkedChannelId, setLinkedChannelId] = useState(team.channels?.[0]?.id ?? "none")
  const [saving, setSaving] = useState(false)
  const [creatingChat, setCreatingChat] = useState(false)

  async function save() {
    setSaving(true)
    const res = await fetch(`/api/teams/${team.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), description: description || null }),
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
    const res = await fetch(`/api/teams/${team.id}`, {
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
    const slug = team.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
    const res = await fetch("/api/channels", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: slug || "team-chat", type: "TEAM", teamId: team.id }),
    })
    if (!res.ok) { toast.error("Failed to create chat"); setCreatingChat(false); return }
    const channel = await res.json()
    const linkRes = await fetch(`/api/teams/${team.id}`, {
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
          <SheetTitle>Team Settings</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Image */}
          <div className="space-y-2">
            <Label>Team Image</Label>
            {imageUrl ? (
              <div className="space-y-2">
                <div
                  className="relative h-40 rounded-lg overflow-hidden bg-muted cursor-crosshair select-none"
                  title="Click to set focal point"
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect()
                    onSetFocal(
                      Math.round(((e.clientX - rect.left) / rect.width) * 100) / 100,
                      Math.round(((e.clientY - rect.top) / rect.height) * 100) / 100,
                    )
                  }}
                >
                  <img src={imageUrl} alt="Team" className="w-full h-full object-cover pointer-events-none"
                    style={{ objectPosition: `${focalX * 100}% ${focalY * 100}%` }} />
                  <div className="absolute w-5 h-5 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                    style={{ left: `${focalX * 100}%`, top: `${focalY * 100}%` }}>
                    <div className="w-full h-full rounded-full border-2 border-white shadow-lg bg-white/20" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-white shadow" />
                    </div>
                  </div>
                  <div className="absolute inset-0 pointer-events-none" style={{
                    backgroundImage: `linear-gradient(to right, transparent calc(${focalX * 100}% - 0.5px), rgba(255,255,255,0.4) calc(${focalX * 100}% - 0.5px), rgba(255,255,255,0.4) calc(${focalX * 100}% + 0.5px), transparent calc(${focalX * 100}% + 0.5px)), linear-gradient(to bottom, transparent calc(${focalY * 100}% - 0.5px), rgba(255,255,255,0.4) calc(${focalY * 100}% - 0.5px), rgba(255,255,255,0.4) calc(${focalY * 100}% + 0.5px), transparent calc(${focalY * 100}% + 0.5px))`,
                  }} />
                  <div className="absolute bottom-1.5 right-2 text-[10px] text-white/70 pointer-events-none">Click to set focus</div>
                </div>
                <button onClick={onRemoveImage} className="text-xs text-muted-foreground hover:text-destructive transition-colors">
                  Remove image
                </button>
              </div>
            ) : null}
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
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What does this team do?" rows={3} />
          </div>

          {/* Linked chat */}
          <div className="space-y-1.5">
            <Label>Linked Chat Channel</Label>
            <Select value={linkedChannelId} onValueChange={linkChannel}>
              <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {allChannels.map((c) => <SelectItem key={c.id} value={c.id}>#{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={createChat} disabled={creatingChat} className="w-full">
              <MessageSquare className="h-4 w-4 mr-1.5" />
              {creatingChat ? "Creating…" : "Create New Chat for this Team"}
            </Button>
          </div>

          {/* Archive / Danger zone */}
          {isAdmin && (
            <>
              <div className="rounded-lg border border-amber-300/60 p-4 space-y-2">
                <p className="text-sm font-medium text-amber-700 dark:text-amber-400">Archive</p>
                <p className="text-xs text-muted-foreground">
                  {team.archivedAt ? "This team is archived. Restore it to make it active again." : "Archiving hides this team from the active list."}
                </p>
                <Button variant="outline" size="sm" onClick={() => { onClose(); onArchive() }}>
                  <Archive className="h-3.5 w-3.5 mr-1.5" />
                  {team.archivedAt ? "Restore Team" : "Archive Team"}
                </Button>
              </div>
              <div className="rounded-lg border border-destructive/40 p-4 space-y-2">
                <p className="text-sm font-medium text-destructive">Danger Zone</p>
                <p className="text-xs text-muted-foreground">Deleting this team cannot be undone.</p>
                <Button variant="destructive" size="sm" onClick={() => { onClose(); onDelete() }}>
                  Delete Team
                </Button>
              </div>
            </>
          )}
        </div>

        <div className="px-6 py-4 border-t shrink-0">
          <Button onClick={save} disabled={saving || !name.trim()} className="w-full">
            {saving ? "Saving…" : "Save Changes"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
