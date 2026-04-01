"use client"

import { useState, useRef, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import {
  Plus, Trash2, X, Archive, ArchiveRestore, FolderOpen, List, Columns,
  MessageSquare, ChevronDown, ChevronRight, ChevronLeft, Settings2, Flag,
  AlertCircle, ArrowUp, ArrowDown, Minus, Check, CheckCircle2, Circle,
  CalendarDays, GanttChart,
} from "lucide-react"

// ── Types ──────────────────────────────────────────────────────────────────────

interface UserMin { id: string; name: string; avatar?: string | null }

interface TaskStatus { id: string; name: string; color: string; order: number }

interface TaskComment {
  id: string
  content: string
  createdAt: string | Date
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
  projectId: string | null
  parentId: string | null
  assignedToId: string | null
  assignedTo: UserMin | null
  assignees: { id: string; userId: string; user: UserMin }[]
  subtasks: TeamTask[] | undefined
  comments: TaskComment[]
  dueDate: string | Date | null
  createdAt: string | Date
}

interface ProjectComment {
  id: string
  content: string
  createdAt: string | Date
  author: UserMin
  parentId: string | null
}

interface TeamProject {
  id: string
  name: string
  description: string | null
  archived: boolean
  createdAt: string | Date
  tasks: TeamTask[]
  comments: ProjectComment[]
}

interface TeamMember { id: string; isLeader: boolean; user: UserMin }

interface ProjectBoardProps {
  teamId: string
  members: TeamMember[]
  initialProjects: TeamProject[]
  initialStandalone: TeamTask[]
  initialStatuses: TaskStatus[]
  currentUserId: string
  userRole: string
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const PRIORITY_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  none:   { label: "None",   color: "text-muted-foreground", icon: <Minus className="h-3 w-3" /> },
  low:    { label: "Low",    color: "text-blue-500",         icon: <ArrowDown className="h-3 w-3" /> },
  medium: { label: "Medium", color: "text-yellow-500",       icon: <ArrowUp className="h-3 w-3" /> },
  high:   { label: "High",   color: "text-orange-500",       icon: <Flag className="h-3 w-3" /> },
  urgent: { label: "Urgent", color: "text-red-500",          icon: <AlertCircle className="h-3 w-3" /> },
}

function toLocalDateString(d: string | Date) {
  const date = new Date(d)
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

function initials(name: string) {
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)
}

function formatDate(d: string | Date | null) {
  if (!d) return null
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

function sortTasks(tasks: TeamTask[]) {
  const pOrder: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3, none: 4 }
  return [...tasks].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1
    return (pOrder[a.priority] ?? 4) - (pOrder[b.priority] ?? 4)
  })
}

// ── TaskCard ───────────────────────────────────────────────────────────────────

const PRIORITY_BUBBLE: Record<string, string> = {
  none:   "bg-muted text-muted-foreground",
  low:    "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400",
  medium: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400",
  high:   "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400",
  urgent: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400",
}

// ── KanbanCard ──────────────────────────────────────────────────────────────────

function KanbanCard({
  task, simplified, showFields, onSelect, onToggle, onDragStart,
}: {
  task: TeamTask
  simplified: boolean
  showFields: string[]
  onSelect: (task: TeamTask) => void
  onToggle: (id: string, done: boolean) => void
  onDragStart: () => void
}) {
  const pri = PRIORITY_CONFIG[task.priority] ?? PRIORITY_CONFIG.none

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onClick={() => onSelect(task)}
      className={cn(
        "rounded-md border bg-card p-2.5 cursor-grab active:cursor-grabbing hover:shadow-sm transition-all space-y-1.5",
        task.done && "opacity-60"
      )}
    >
      {/* Title */}
      <p className={cn("text-sm leading-snug", task.done && "line-through text-muted-foreground")}>
        {task.content}
      </p>

      {/* Fields */}
      {!simplified && (
        <div className="flex flex-wrap gap-1.5 items-center">
          {task.priority !== "none" && (
            <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded-full", PRIORITY_BUBBLE[task.priority])}>
              {pri.label}
            </span>
          )}
          {task.status && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
              style={{ backgroundColor: task.status.color + "22", color: task.status.color }}>
              {task.status.name}
            </span>
          )}
          {task.dueDate && (
            <span className="text-[10px] text-muted-foreground">{formatDate(task.dueDate)}</span>
          )}
          {task.assignees.length > 0 && (
            <div className="flex -space-x-1 ml-auto">
              {task.assignees.slice(0, 3).map(a => (
                <Avatar key={a.id} className="h-4 w-4 border border-background">
                  {a.user.avatar && <AvatarImage src={a.user.avatar} alt={a.user.name} />}
                  <AvatarFallback className="text-[7px]">{initials(a.user.name)}</AvatarFallback>
                </Avatar>
              ))}
            </div>
          )}
        </div>
      )}

      {simplified && showFields.length > 0 && (
        <div className="flex flex-col gap-1">
          {showFields.includes("priority") && task.priority !== "none" && (
            <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded-full w-fit", PRIORITY_BUBBLE[task.priority])}>
              {pri.label}
            </span>
          )}
          {showFields.includes("status") && task.status && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full w-fit"
              style={{ backgroundColor: task.status.color + "22", color: task.status.color }}>
              {task.status.name}
            </span>
          )}
          {showFields.includes("dueDate") && task.dueDate && (
            <span className="text-[10px] text-muted-foreground">{formatDate(task.dueDate)}</span>
          )}
          {showFields.includes("assignees") && task.assignees.length > 0 && (
            <div className="flex -space-x-1">
              {task.assignees.slice(0, 3).map(a => (
                <Avatar key={a.id} className="h-4 w-4 border border-background">
                  {a.user.avatar && <AvatarImage src={a.user.avatar} alt={a.user.name} />}
                  <AvatarFallback className="text-[7px]">{initials(a.user.name)}</AvatarFallback>
                </Avatar>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function TaskCard({
  task, statuses, teamId, onToggle, onDelete, onUpdate, onSelect,
}: {
  task: TeamTask
  statuses: TaskStatus[]
  teamId: string
  onToggle: (id: string, done: boolean) => void
  onDelete: (id: string) => void
  onUpdate: (task: TeamTask) => void
  onSelect: (task: TeamTask) => void
}) {
  const pri = PRIORITY_CONFIG[task.priority] ?? PRIORITY_CONFIG.none
  const [localDone, setLocalDone] = useState(task.done)

  async function patch(data: Record<string, unknown>) {
    const res = await fetch(`/api/teams/${teamId}/tasks/${task.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    if (res.ok) onUpdate(await res.json())
  }

  return (
    <div
      className={cn(
        "group flex items-center gap-3 px-3 py-2 rounded-md border bg-card hover:bg-accent/30 cursor-pointer transition-colors",
        localDone && "opacity-60"
      )}
      onClick={() => onSelect(task)}
    >
      {/* Title */}
      <span className={cn("flex-1 min-w-0 text-sm truncate", localDone && "line-through text-muted-foreground")}>
        {task.content}
      </span>

      {/* Priority — popover */}
      <div className="w-28 shrink-0">
        <Popover>
          <PopoverTrigger asChild>
            <button type="button" onClick={e => e.stopPropagation()}
              className={cn(
                "h-5 text-[10px] font-medium px-2 rounded-full flex items-center gap-1 transition-colors",
                task.priority !== "none" ? PRIORITY_BUBBLE[task.priority] : "text-muted-foreground hover:bg-accent/50"
              )}
            >
              {task.priority !== "none" && <>{pri.icon}<span>{pri.label}</span></>}
            </button>
          </PopoverTrigger>
          <PopoverContent side="bottom" align="start" className="w-36 p-1">
            {Object.entries(PRIORITY_CONFIG).map(([k, v]) => (
              <button key={k} type="button" onClick={() => patch({ priority: k })}
                className={cn("w-full text-left text-xs px-2 py-1.5 rounded hover:bg-accent flex items-center gap-1.5", task.priority === k && "font-medium")}>
                <span className={v.color}>{v.icon}</span>{v.label}
              </button>
            ))}
          </PopoverContent>
        </Popover>
      </div>

      {/* Status — popover */}
      <div className="w-32 shrink-0">
        <Popover>
          <PopoverTrigger asChild>
            <button type="button" onClick={e => e.stopPropagation()}
              className={cn(
                "h-5 text-[10px] font-medium px-2 rounded-full flex items-center gap-1 transition-colors",
                !task.status && "text-muted-foreground hover:bg-accent/50"
              )}
              style={task.status ? { backgroundColor: task.status.color + "22", color: task.status.color } : undefined}
            >
              {task.status
                ? <><span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: task.status.color }} />{task.status.name}</>
                : "No Status"}
            </button>
          </PopoverTrigger>
          <PopoverContent side="bottom" align="start" className="w-40 p-1">
            <button type="button" onClick={() => patch({ statusId: null })}
              className={cn("w-full text-left text-xs px-2 py-1.5 rounded hover:bg-accent", !task.statusId && "font-medium")}>
              No status
            </button>
            {statuses.map(s => (
              <button key={s.id} type="button" onClick={() => patch({ statusId: s.id })}
                className={cn("w-full text-left text-xs px-2 py-1.5 rounded hover:bg-accent flex items-center gap-1.5", task.statusId === s.id && "font-medium")}>
                <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: s.color }} />{s.name}
              </button>
            ))}
          </PopoverContent>
        </Popover>
      </div>

      {/* Due date — popover */}
      <div className="w-20 shrink-0">
        <Popover>
          <PopoverTrigger asChild>
            <button type="button" onClick={e => e.stopPropagation()}
              className="text-[10px] text-muted-foreground tabular-nums whitespace-nowrap hover:text-foreground transition-colors text-left"
            >
              {task.dueDate ? formatDate(task.dueDate) : ""}
            </button>
          </PopoverTrigger>
          <PopoverContent side="bottom" align="start" className="w-auto p-2">
            <input type="date"
              value={task.dueDate ? toLocalDateString(task.dueDate) : ""}
              onChange={e => patch({ dueDate: e.target.value || null })}
              className="text-sm bg-transparent focus:outline-none"
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Done — completion bubble */}
      <div className="w-24 shrink-0">
        <button type="button"
          onClick={e => { e.stopPropagation(); setLocalDone(!localDone); onToggle(task.id, !localDone) }}
          className={cn(
            "flex items-center h-5 text-[10px] px-2.5 rounded-full font-medium transition-all duration-75 select-none overflow-hidden",
            localDone ? "bg-green-500 text-white" : "bg-muted text-muted-foreground hover:bg-muted/70"
          )}
        >
          {localDone ? "Complete" : "Incomplete"}
          <span className={cn(
            "overflow-hidden transition-all duration-75 flex items-center",
            localDone ? "max-w-[14px] opacity-100 scale-100 ml-1.5" : "max-w-0 opacity-0 scale-75"
          )}>
            <Check className="h-3 w-3 shrink-0" />
          </span>
        </button>
      </div>
    </div>
  )
}

// ── AddTaskRow ─────────────────────────────────────────────────────────────────

function AddTaskRow({ teamId, projectId, parentId, statusId, members, statuses, onAdd }: {
  teamId: string
  projectId: string | null
  parentId?: string
  statusId?: string
  members: TeamMember[]
  statuses: TaskStatus[]
  onAdd: (task: TeamTask) => void
}) {
  const [open, setOpen] = useState(false)
  const [content, setContent] = useState("")
  const [priority, setPriority] = useState("none")
  const [assigneeId, setAssigneeId] = useState("none")
  const [due, setDue] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  async function submit() {
    if (!content.trim()) return
    const res = await fetch(`/api/teams/${teamId}/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: content.trim(),
        projectId: projectId || undefined,
        parentId: parentId || undefined,
        statusId: statusId || undefined,
        priority,
        assignedToId: assigneeId !== "none" ? assigneeId : undefined,
        dueDate: due || undefined,
      }),
    })
    if (!res.ok) { toast.error("Failed to add task"); return }
    const task = await res.json()
    onAdd(task)
    setContent(""); setPriority("none"); setAssigneeId("none"); setDue(""); setOpen(false)
  }

  if (!open) {
    return (
      <button
        onClick={() => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 50) }}
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
      >
        <Plus className="h-3 w-3" /> Add task
      </button>
    )
  }

  return (
    <div className="space-y-2 pt-1">
      <Input ref={inputRef} placeholder="Task title…" value={content} onChange={e => setContent(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter") submit(); if (e.key === "Escape") { setOpen(false); setContent("") } }}
        className="h-8 text-sm" />
      <div className="flex gap-2 flex-wrap items-center">
        <Select value={priority} onValueChange={setPriority}>
          <SelectTrigger className="w-28 h-7 text-xs"><SelectValue placeholder="Priority" /></SelectTrigger>
          <SelectContent>
            {Object.entries(PRIORITY_CONFIG).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={assigneeId} onValueChange={setAssigneeId}>
          <SelectTrigger className="w-36 h-7 text-xs"><SelectValue placeholder="Assign to…" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Unassigned</SelectItem>
            {members.map(m => <SelectItem key={m.user.id} value={m.user.id}>{m.user.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input type="date" className="h-7 text-xs w-36" value={due} onChange={e => setDue(e.target.value)} />
        <Button size="sm" className="h-7 text-xs" onClick={submit} disabled={!content.trim()}>Add</Button>
        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setOpen(false); setContent("") }}>Cancel</Button>
      </div>
    </div>
  )
}

// ── CommentsSection ────────────────────────────────────────────────────────────

function CommentsSection({ comments, onAdd }: {
  comments: (TaskComment | ProjectComment)[]
  onAdd: (content: string, parentId?: string) => Promise<void>
}) {
  const [draft, setDraft] = useState("")
  const [saving, setSaving] = useState(false)
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyDraft, setReplyDraft] = useState("")
  const [replySaving, setReplySaving] = useState(false)

  const topLevel = comments.filter(c => !c.parentId)
  const repliesMap = new Map<string, (TaskComment | ProjectComment)[]>()
  for (const c of comments) {
    if (c.parentId) {
      if (!repliesMap.has(c.parentId)) repliesMap.set(c.parentId, [])
      repliesMap.get(c.parentId)!.push(c)
    }
  }

  async function submit() {
    if (!draft.trim()) return
    setSaving(true)
    try {
      await onAdd(draft.trim())
      setDraft("")
    } finally {
      setSaving(false)
    }
  }

  async function submitReply(parentId: string) {
    if (!replyDraft.trim()) return
    setReplySaving(true)
    try {
      await onAdd(replyDraft.trim(), parentId)
      setReplyDraft("")
      setReplyingTo(null)
    } finally {
      setReplySaving(false)
    }
  }

  function renderComment(c: TaskComment | ProjectComment, isReply = false) {
    const replies = repliesMap.get(c.id) ?? []
    return (
      <div key={c.id} className={cn("flex gap-2", isReply && "ml-8 mt-1.5")}>
        <Avatar className="h-6 w-6 shrink-0 mt-0.5">
          {c.author.avatar && <AvatarImage src={c.author.avatar} alt={c.author.name} />}
          <AvatarFallback className="text-[9px]">{initials(c.author.name)}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-1.5">
            <span className="text-xs font-medium">{c.author.name}</span>
            <span className="text-[10px] text-muted-foreground">
              {new Date(c.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </span>
          </div>
          <p className="text-xs text-foreground whitespace-pre-wrap">{c.content}</p>
          {!isReply && (
            <button
              className="text-[10px] text-muted-foreground hover:text-foreground mt-0.5 transition-colors"
              onClick={() => { setReplyingTo(replyingTo === c.id ? null : c.id); setReplyDraft("") }}
            >
              {replyingTo === c.id ? "Cancel" : "Reply"}
            </button>
          )}
          {replies.map(r => renderComment(r, true))}
          {replyingTo === c.id && (
            <div className="flex gap-1.5 mt-2">
              <Textarea
                autoFocus
                placeholder={`Reply to ${c.author.name}…`}
                value={replyDraft}
                onChange={e => setReplyDraft(e.target.value)}
                rows={2}
                className="text-xs resize-none flex-1"
                onKeyDown={e => { if (e.key === "Enter" && e.metaKey) submitReply(c.id) }}
              />
              <Button size="sm" className="self-end h-7 text-xs" onClick={() => submitReply(c.id)} disabled={replySaving || !replyDraft.trim()}>
                {replySaving ? "…" : "Reply"}
              </Button>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Comments</h4>
      {topLevel.length === 0 && <p className="text-xs text-muted-foreground">No comments yet.</p>}
      <div className="space-y-3">
        {topLevel.map(c => renderComment(c))}
      </div>
      <div className="flex gap-2">
        <Textarea
          placeholder="Add a comment…"
          value={draft}
          onChange={e => setDraft(e.target.value)}
          rows={2}
          className="text-xs resize-none flex-1"
          onKeyDown={e => { if (e.key === "Enter" && e.metaKey) submit() }}
        />
        <Button type="button" size="sm" className="self-end" onClick={submit} disabled={saving || !draft.trim()}>
          {saving ? "…" : "Post"}
        </Button>
      </div>
    </div>
  )
}

// ── ExpandedTaskCard ───────────────────────────────────────────────────────────

function ExpandedTaskCard({
  task, teamId, members, statuses, onClose, onUpdate, onDelete,
}: {
  task: TeamTask
  teamId: string
  members: TeamMember[]
  statuses: TaskStatus[]
  onClose: () => void
  onUpdate: (task: TeamTask) => void
  onDelete: (taskId: string) => void
}) {
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleDraft, setTitleDraft] = useState("")
  const [descDraft, setDescDraft] = useState("")
  const [editingDesc, setEditingDesc] = useState(false)
  const [editingSubtaskId, setEditingSubtaskId] = useState<string | null>(null)
  const [expandedSubtaskId, setExpandedSubtaskId] = useState<string | null>(null)
  const [subtaskDraft, setSubtaskDraft] = useState("")
  const [localDone, setLocalDone] = useState(task.done)

  async function patch(data: Record<string, unknown>) {
    const res = await fetch(`/api/teams/${teamId}/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    if (res.ok) onUpdate(await res.json())
  }

  async function addAssignee(userId: string) {
    const res = await fetch(`/api/teams/${teamId}/tasks/${task.id}/assignees`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    })
    if (res.ok) {
      const assignee = await res.json()
      onUpdate({ ...task, assignees: [...task.assignees.filter(a => a.userId !== userId), assignee] })
    }
  }

  async function removeAssignee(userId: string) {
    const res = await fetch(`/api/teams/${teamId}/tasks/${task.id}/assignees`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    })
    if (res.ok) onUpdate({ ...task, assignees: task.assignees.filter(a => a.userId !== userId) })
  }

  async function addComment(content: string, parentId?: string) {
    const res = await fetch(`/api/teams/${teamId}/tasks/${task.id}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, parentId: parentId || null }),
    })
    if (!res.ok) { toast.error("Failed to post comment"); return }
    const comment = await res.json()
    onUpdate({ ...task, comments: [...task.comments, comment] })
  }

  async function patchSubtask(subId: string, data: Record<string, unknown>) {
    const res = await fetch(`/api/teams/${teamId}/tasks/${subId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    if (res.ok) updateSubtask(await res.json())
  }

  async function addSubtaskAssignee(subId: string, userId: string, sub: TeamTask) {
    const res = await fetch(`/api/teams/${teamId}/tasks/${subId}/assignees`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    })
    if (res.ok) {
      const assignee = await res.json()
      updateSubtask({ ...sub, assignees: [...sub.assignees.filter(a => a.userId !== userId), assignee] })
    }
  }

  async function removeSubtaskAssignee(subId: string, userId: string, sub: TeamTask) {
    const res = await fetch(`/api/teams/${teamId}/tasks/${subId}/assignees`, {
      method: "DELETE", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    })
    if (res.ok) updateSubtask({ ...sub, assignees: sub.assignees.filter(a => a.userId !== userId) })
  }

  function addSubtask(subtask: TeamTask) {
    onUpdate({ ...task, subtasks: [...(task.subtasks ?? []), subtask] })
  }

  function updateSubtask(updated: TeamTask) {
    onUpdate({ ...task, subtasks: (task.subtasks ?? []).map(s => s.id === updated.id ? updated : s) })
  }

  function removeSubtask(id: string) {
    onUpdate({ ...task, subtasks: (task.subtasks ?? []).filter(s => s.id !== id) })
  }

  const assignedUserIds = new Set(task.assignees.map(a => a.userId))
  const pri = PRIORITY_CONFIG[task.priority] ?? PRIORITY_CONFIG.none

  return (
    <div className="rounded-lg border bg-card shadow-sm">
      {/* Card header — same column widths as TaskCard so meta aligns with table */}
      <div
        className="flex items-center gap-3 px-3 py-2 border-b cursor-pointer hover:bg-accent/30 transition-colors rounded-t-lg"
        onClick={onClose}
      >
        {/* Title — flex-1, pointer-events-none so only the text opens edit */}
        <div className="flex-1 min-w-0 pointer-events-none">
          {editingTitle ? (
            <Input
              autoFocus
              value={titleDraft}
              onChange={e => setTitleDraft(e.target.value)}
              onBlur={async () => { if (titleDraft.trim() && titleDraft !== task.content) await patch({ content: titleDraft }); setEditingTitle(false) }}
              onKeyDown={e => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); if (e.key === "Escape") { setEditingTitle(false); setTitleDraft(task.content) } }}
              onClick={e => e.stopPropagation()}
              className="h-7 text-sm font-semibold pointer-events-auto"
            />
          ) : (
            <p
              className={cn("text-sm font-semibold cursor-text hover:underline leading-snug truncate pointer-events-auto w-fit max-w-full", localDone && "line-through text-muted-foreground")}
              onClick={e => { e.stopPropagation(); setTitleDraft(task.content); setEditingTitle(true) }}
            >
              {task.content}
            </p>
          )}
        </div>

        {/* Priority — w-24, matches table column */}
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              onClick={e => e.stopPropagation()}
              className={cn(
                "w-28 shrink-0 h-5 text-[10px] font-medium px-2 rounded-full flex items-center gap-1 transition-colors",
                task.priority !== "none" ? PRIORITY_BUBBLE[task.priority] : "text-muted-foreground hover:bg-accent/50"
              )}
            >
              {task.priority !== "none" && <>{pri.icon}<span>{pri.label}</span></>}
            </button>
          </PopoverTrigger>
          <PopoverContent side="bottom" align="start" className="w-36 p-1">
            {Object.entries(PRIORITY_CONFIG).map(([k, v]) => (
              <button key={k} type="button"
                onClick={() => patch({ priority: k })}
                className={cn("w-full text-left text-xs px-2 py-1.5 rounded hover:bg-accent flex items-center gap-1.5", task.priority === k && "font-medium")}
              >
                <span className={v.color}>{v.icon}</span>{v.label}
              </button>
            ))}
          </PopoverContent>
        </Popover>

        {/* Status — w-28, matches table column */}
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              onClick={e => e.stopPropagation()}
              className={cn(
                "w-32 shrink-0 h-5 text-[10px] font-medium px-2 rounded-full flex items-center gap-1 transition-colors",
                !task.status && "text-muted-foreground hover:bg-accent/50"
              )}
              style={task.status ? { backgroundColor: task.status.color + "22", color: task.status.color } : undefined}
            >
              {task.status
                ? <><span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: task.status.color }} />{task.status.name}</>
                : "No Status"}
            </button>
          </PopoverTrigger>
          <PopoverContent side="bottom" align="start" className="w-40 p-1">
            <button type="button" onClick={() => patch({ statusId: null })}
              className={cn("w-full text-left text-xs px-2 py-1.5 rounded hover:bg-accent", !task.statusId && "font-medium")}>
              No status
            </button>
            {statuses.map(s => (
              <button key={s.id} type="button" onClick={() => patch({ statusId: s.id })}
                className={cn("w-full text-left text-xs px-2 py-1.5 rounded hover:bg-accent flex items-center gap-1.5", task.statusId === s.id && "font-medium")}>
                <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: s.color }} />{s.name}
              </button>
            ))}
          </PopoverContent>
        </Popover>

        {/* Due date — w-20, matches table column */}
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              onClick={e => e.stopPropagation()}
              className="w-20 shrink-0 text-[10px] text-muted-foreground tabular-nums whitespace-nowrap text-left hover:text-foreground transition-colors"
            >
              {task.dueDate ? formatDate(task.dueDate) : ""}
            </button>
          </PopoverTrigger>
          <PopoverContent side="bottom" align="start" className="w-auto p-2">
            <input
              type="date"
              value={task.dueDate ? toLocalDateString(task.dueDate) : ""}
              onChange={e => patch({ dueDate: e.target.value || null })}
              className="text-sm bg-transparent focus:outline-none"
            />
          </PopoverContent>
        </Popover>

        {/* Done — w-24 column, completion bubble */}
        <div className="w-24 shrink-0">
          <button
            type="button"
            onClick={e => { e.stopPropagation(); setLocalDone(!localDone); patch({ done: !localDone }) }}
            className={cn(
              "flex items-center h-5 text-[10px] px-2.5 rounded-full font-medium transition-all duration-75 select-none overflow-hidden",
              localDone ? "bg-green-500 text-white" : "bg-muted text-muted-foreground hover:bg-muted/70"
            )}
          >
            {localDone ? "Complete" : "Incomplete"}
            <span className={cn(
              "overflow-hidden transition-all duration-75 flex items-center",
              localDone ? "max-w-[14px] opacity-100 scale-100 ml-1.5" : "max-w-0 opacity-0 scale-75"
            )}>
              <Check className="h-3 w-3 shrink-0" />
            </span>
          </button>
        </div>
      </div>

      {/* Detail body */}
      <div className="px-4 py-4 space-y-5">
        {/* Assignees */}
        <div className="space-y-1.5">
          <span className="text-xs text-muted-foreground">Assignees</span>
          <div className="flex flex-wrap gap-1.5">
            {task.assignees.map(a => (
              <div key={a.id} className="flex items-center gap-1 bg-muted rounded-full px-2 py-0.5 text-xs">
                <Avatar className="h-4 w-4">
                  {a.user.avatar && <AvatarImage src={a.user.avatar} alt={a.user.name} />}
                  <AvatarFallback className="text-[8px]">{initials(a.user.name)}</AvatarFallback>
                </Avatar>
                {a.user.name}
                <button onClick={() => removeAssignee(a.userId)} className="text-muted-foreground hover:text-destructive ml-0.5"><X className="h-3 w-3" /></button>
              </div>
            ))}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-6 text-xs rounded-full px-2">
                  <Plus className="h-3 w-3 mr-1" /> Add
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-48 p-1">
                {members.filter(m => !assignedUserIds.has(m.user.id)).map(m => (
                  <button key={m.user.id} onClick={() => addAssignee(m.user.id)}
                    className="w-full text-left text-xs px-2 py-1.5 rounded hover:bg-accent flex items-center gap-2">
                    <Avatar className="h-5 w-5">
                      {m.user.avatar && <AvatarImage src={m.user.avatar} alt={m.user.name} />}
                      <AvatarFallback className="text-[9px]">{initials(m.user.name)}</AvatarFallback>
                    </Avatar>
                    {m.user.name}
                  </button>
                ))}
                {members.filter(m => !assignedUserIds.has(m.user.id)).length === 0 && (
                  <p className="text-xs text-muted-foreground px-2 py-1">All members assigned</p>
                )}
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Notes */}
        <div className="space-y-1.5">
          <span className="text-xs text-muted-foreground">Notes</span>
          {editingDesc ? (
            <div className="space-y-2">
              <Textarea autoFocus value={descDraft} onChange={e => setDescDraft(e.target.value)}
                rows={3} className="text-sm resize-none" />
              <div className="flex gap-2">
                <Button size="sm" className="h-7 text-xs" onClick={async () => { await patch({ description: descDraft }); setEditingDesc(false) }}>Save</Button>
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditingDesc(false)}>Cancel</Button>
              </div>
            </div>
          ) : (
            <div className="text-sm cursor-pointer rounded p-1 -ml-1 hover:bg-accent/50 min-h-[1.75rem]"
              onClick={() => { setDescDraft(task.description ?? ""); setEditingDesc(true) }}>
              {task.description
                ? <p className="whitespace-pre-wrap text-foreground">{task.description}</p>
                : <span className="text-muted-foreground text-xs">Add notes…</span>}
            </div>
          )}
        </div>

        {/* Subtasks */}
        <div className="space-y-1.5">
          <span className="text-xs text-muted-foreground">
            Subtasks {(task.subtasks ?? []).length > 0 && `(${(task.subtasks ?? []).filter(s => s.done).length}/${(task.subtasks ?? []).length})`}
          </span>
          <div className="space-y-0.5">
            {sortTasks(task.subtasks ?? []).map(sub => {
              const subPri = PRIORITY_CONFIG[sub.priority] ?? PRIORITY_CONFIG.none
              const subAssignedIds = new Set(sub.assignees.map(a => a.userId))
              const isExpanded = expandedSubtaskId === sub.id
              return (
                <div key={sub.id} className="rounded-md border border-transparent hover:border-border/50 px-2 py-1 space-y-1 transition-colors">
                  {/* Title row */}
                  <div className="flex items-center gap-2">
                    <Checkbox checked={sub.done} onCheckedChange={async checked => {
                      const res = await fetch(`/api/teams/${teamId}/tasks/${sub.id}`, {
                        method: "PATCH", headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ done: !!checked }),
                      })
                      if (res.ok) updateSubtask(await res.json())
                    }} />

                    {editingSubtaskId === sub.id ? (
                      <Input
                        autoFocus
                        value={subtaskDraft}
                        onChange={e => setSubtaskDraft(e.target.value)}
                        onBlur={async () => {
                          if (subtaskDraft.trim() && subtaskDraft !== sub.content) {
                            const res = await fetch(`/api/teams/${teamId}/tasks/${sub.id}`, {
                              method: "PATCH", headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ content: subtaskDraft.trim() }),
                            })
                            if (res.ok) updateSubtask(await res.json())
                          }
                          setEditingSubtaskId(null)
                        }}
                        onKeyDown={e => {
                          if (e.key === "Enter") (e.target as HTMLInputElement).blur()
                          if (e.key === "Escape") setEditingSubtaskId(null)
                        }}
                        className="h-6 text-sm flex-1 px-1 py-0"
                      />
                    ) : (
                      <span
                        className={cn("text-sm flex-1 min-w-0 truncate cursor-text", sub.done && "line-through text-muted-foreground")}
                        onClick={() => { setEditingSubtaskId(sub.id); setSubtaskDraft(sub.content); setExpandedSubtaskId(sub.id) }}
                      >
                        {sub.content}
                      </span>
                    )}

                    {/* Simplified inline meta — hidden when expanded */}
                    {!isExpanded && (
                      <div
                        className="flex items-center gap-1 shrink-0 cursor-pointer"
                        onClick={() => setExpandedSubtaskId(sub.id)}
                      >
                        {sub.priority !== "none" && (
                          <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded-full", PRIORITY_BUBBLE[sub.priority])}>
                            {subPri.label}
                          </span>
                        )}
                        {sub.status && (
                          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                            style={{ backgroundColor: sub.status.color + "22", color: sub.status.color }}>
                            {sub.status.name}
                          </span>
                        )}
                        {sub.dueDate && (
                          <span className="text-[10px] text-muted-foreground whitespace-nowrap">{formatDate(sub.dueDate)}</span>
                        )}
                        {sub.assignees.slice(0, 2).map(a => (
                          <Avatar key={a.id} className="h-4 w-4 border border-background">
                            {a.user.avatar && <AvatarImage src={a.user.avatar} alt={a.user.name} />}
                            <AvatarFallback className="text-[7px]">{initials(a.user.name)}</AvatarFallback>
                          </Avatar>
                        ))}
                      </div>
                    )}

                    <button onClick={async () => {
                      const res = await fetch(`/api/teams/${teamId}/tasks/${sub.id}`, { method: "DELETE" })
                      if (res.ok) removeSubtask(sub.id)
                      else toast.error("Failed to delete subtask")
                    }} className="text-muted-foreground hover:text-destructive shrink-0">
                      <X className="h-3 w-3" />
                    </button>
                  </div>

                  {/* Expanded edit row — dropdowns only when editing */}
                  {isExpanded && (
                    <div className="flex items-center gap-1.5 pl-6 flex-wrap">
                      <Select value={sub.priority} onValueChange={v => patchSubtask(sub.id, { priority: v })}>
                        <SelectTrigger className="h-5 text-[10px] w-20 px-1.5 gap-0.5">
                          <SelectValue>
                            <span className={cn("flex items-center gap-0.5", subPri.color)}>
                              {subPri.icon}<span className="truncate">{subPri.label}</span>
                            </span>
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(PRIORITY_CONFIG).map(([k, v]) => (
                            <SelectItem key={k} value={k}>
                              <span className={cn("flex items-center gap-1", v.color)}>{v.icon}{v.label}</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Select value={sub.statusId ?? "none"} onValueChange={v => patchSubtask(sub.id, { statusId: v === "none" ? null : v })}>
                        <SelectTrigger className="h-5 text-[10px] w-24 px-1.5">
                          <SelectValue placeholder="No status">
                            {sub.status
                              ? <span className="flex items-center gap-0.5">
                                  <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: sub.status.color }} />
                                  <span className="truncate">{sub.status.name}</span>
                                </span>
                              : <span className="text-muted-foreground">Status</span>}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No status</SelectItem>
                          {statuses.map(s => (
                            <SelectItem key={s.id} value={s.id}>
                              <span className="flex items-center gap-1.5">
                                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />{s.name}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <div className="h-5 overflow-hidden rounded border border-input">
                        <input
                          type="date"
                          value={sub.dueDate ? toLocalDateString(sub.dueDate) : ""}
                          onChange={e => patchSubtask(sub.id, { dueDate: e.target.value || null })}
                          className="h-full w-28 bg-transparent px-1.5 text-[10px] focus:outline-none"
                        />
                      </div>

                      <div className="flex items-center gap-1 ml-auto">
                        {sub.assignees.map(a => (
                          <button key={a.id} title={`Remove ${a.user.name}`}
                            onClick={() => removeSubtaskAssignee(sub.id, a.userId, sub)}
                            className="group/av relative">
                            <Avatar className="h-4 w-4 border border-background">
                              {a.user.avatar && <AvatarImage src={a.user.avatar} alt={a.user.name} />}
                              <AvatarFallback className="text-[7px]">{initials(a.user.name)}</AvatarFallback>
                            </Avatar>
                            <span className="absolute inset-0 rounded-full bg-destructive/70 opacity-0 group-hover/av:opacity-100 flex items-center justify-center transition-opacity">
                              <X className="h-2 w-2 text-white" />
                            </span>
                          </button>
                        ))}
                        <Popover>
                          <PopoverTrigger asChild>
                            <button className="h-4 w-4 rounded-full border border-dashed border-muted-foreground flex items-center justify-center hover:border-foreground transition-colors">
                              <Plus className="h-2.5 w-2.5 text-muted-foreground" />
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-40 p-1">
                            {members.filter(m => !subAssignedIds.has(m.user.id)).map(m => (
                              <button key={m.user.id} onClick={() => addSubtaskAssignee(sub.id, m.user.id, sub)}
                                className="w-full text-left text-xs px-2 py-1.5 rounded hover:bg-accent flex items-center gap-2">
                                <Avatar className="h-4 w-4">
                                {m.user.avatar && <AvatarImage src={m.user.avatar} alt={m.user.name} />}
                                <AvatarFallback className="text-[8px]">{initials(m.user.name)}</AvatarFallback>
                              </Avatar>
                                {m.user.name}
                              </button>
                            ))}
                            {members.filter(m => !subAssignedIds.has(m.user.id)).length === 0 && (
                              <p className="text-xs text-muted-foreground px-2 py-1">All assigned</p>
                            )}
                          </PopoverContent>
                        </Popover>
                      </div>

                      <button type="button" onClick={() => setExpandedSubtaskId(null)}
                        className="text-[10px] text-muted-foreground hover:text-foreground ml-1 transition-colors">
                        Done
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          <AddTaskRow teamId={teamId} projectId={task.projectId} parentId={task.id}
            members={members} statuses={statuses} onAdd={addSubtask} />
        </div>

        {/* Comments */}
        <div className="border-t pt-3">
          <CommentsSection comments={task.comments} onAdd={addComment} />
        </div>

        {/* Delete */}
        <div className="border-t pt-2">
          <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10 h-7 text-xs"
            onClick={() => { onDelete(task.id); onClose() }}>
            <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete Task
          </Button>
        </div>
      </div>
    </div>
  )
}

// ── StatusManager ──────────────────────────────────────────────────────────────

const STATUS_PRESET_COLORS = [
  "#ef4444", "#f97316", "#f59e0b", "#84cc16",
  "#22c55e", "#06b6d4", "#3b82f6", "#8b5cf6",
  "#ec4899", "#6b7280",
]

function StatusManager({
  open, onClose, teamId, statuses, onUpdate,
}: {
  open: boolean
  onClose: () => void
  teamId: string
  statuses: TaskStatus[]
  onUpdate: (statuses: TaskStatus[]) => void
}) {
  const [name, setName] = useState("")
  const [color, setColor] = useState("#3b82f6")
  const [saving, setSaving] = useState(false)
  const colorInputRef = useRef<HTMLInputElement>(null)
  const isCustom = !STATUS_PRESET_COLORS.includes(color)

  async function addStatus() {
    if (!name.trim()) return
    setSaving(true)
    const res = await fetch(`/api/teams/${teamId}/statuses`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), color }),
    })
    setSaving(false)
    if (res.ok) { onUpdate([...statuses, await res.json()]); setName(""); setColor("#3b82f6") }
  }

  async function deleteStatus(id: string) {
    await fetch(`/api/teams/${teamId}/statuses/${id}`, { method: "DELETE" })
    onUpdate(statuses.filter(s => s.id !== id))
  }

  return (
    <Dialog open={open} onOpenChange={o => { if (!o) onClose() }}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Manage Statuses</DialogTitle></DialogHeader>
        <div className="space-y-2">
          {statuses.length === 0 && <p className="text-sm text-muted-foreground">No statuses defined.</p>}
          {statuses.map(s => (
            <div key={s.id} className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
              <span className="text-sm flex-1">{s.name}</span>
              <button onClick={() => deleteStatus(s.id)} className="text-muted-foreground hover:text-destructive">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
        <div className="space-y-3 pt-2 border-t">
          {/* Color picker */}
          <div className="space-y-1.5">
            <span className="text-xs text-muted-foreground">Color</span>
            <div className="flex flex-wrap gap-1.5 items-center">
              {STATUS_PRESET_COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={cn(
                    "h-6 w-6 rounded-full border-2 transition-transform hover:scale-110",
                    color === c ? "border-foreground scale-110" : "border-transparent"
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
              {/* Custom color swatch */}
              <button
                type="button"
                onClick={() => colorInputRef.current?.click()}
                className={cn(
                  "h-6 w-6 rounded-full border-2 transition-transform hover:scale-110 relative overflow-hidden",
                  isCustom ? "border-foreground scale-110" : "border-transparent"
                )}
                title="Custom color"
                style={isCustom ? { backgroundColor: color } : undefined}
              >
                {!isCustom && (
                  <span
                    className="absolute inset-0 rounded-full"
                    style={{ background: "conic-gradient(#ef4444, #f97316, #eab308, #22c55e, #06b6d4, #8b5cf6, #ec4899, #ef4444)" }}
                  />
                )}
              </button>
              <input
                ref={colorInputRef}
                type="color"
                value={color}
                onChange={e => setColor(e.target.value)}
                className="sr-only"
              />
            </div>
          </div>
          {/* Name + add */}
          <div className="flex gap-2">
            <div className="h-8 w-8 rounded-full shrink-0 border" style={{ backgroundColor: color }} />
            <Input placeholder="Status name" value={name} onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && addStatus()} className="h-8 text-sm" />
            <Button size="sm" className="h-8" onClick={addStatus} disabled={saving || !name.trim()}>
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ── Main ProjectBoard ──────────────────────────────────────────────────────────

export default function ProjectBoard({
  teamId, members, initialProjects, initialStandalone, initialStatuses, currentUserId, userRole,
}: ProjectBoardProps) {
  const searchParams = useSearchParams()
  const [projects, setProjects] = useState<TeamProject[]>(initialProjects)
  const [standalones, setStandalones] = useState<TeamTask[]>(initialStandalone)
  const [statuses, setStatuses] = useState<TaskStatus[]>(initialStatuses)
  const pendingDeletes = useRef<Map<string, { snapshot: TeamTask | null; timer: ReturnType<typeof setTimeout> }>>(new Map())
  const dragTaskIdRef = useRef<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | "standalone" | null>(
    initialProjects.find(p => !p.archived)?.id ?? (initialProjects.length === 0 ? "standalone" : null)
  )
  const [viewMode, setViewMode] = useState<"list" | "kanban" | "calendar" | "timeline">("list")
  const [calMonth, setCalMonth] = useState(() => { const d = new Date(); d.setDate(1); d.setHours(0,0,0,0); return d })
  const [showArchived, setShowArchived] = useState(false)
  const [selectedTask, setSelectedTask] = useState<TeamTask | null>(null)

  // Auto-open task from ?task= URL param (e.g. navigating from the dashboard widget)
  useEffect(() => {
    const taskId = searchParams.get("task")
    if (!taskId) return
    const allTasks = [...initialStandalone, ...initialProjects.flatMap(p => p.tasks)]
    const found = allTasks.find(t => t.id === taskId)
    if (!found) return
    // Switch to the project that contains this task
    const owningProject = initialProjects.find(p => p.tasks.some(t => t.id === taskId))
    if (owningProject) setSelectedId(owningProject.id)
    else setSelectedId("standalone")
    setSelectedTask(found)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const [newProjectOpen, setNewProjectOpen] = useState(false)
  const [newProjectName, setNewProjectName] = useState("")
  const [newProjectDesc, setNewProjectDesc] = useState("")
  const [editingProjectField, setEditingProjectField] = useState<"name" | "desc" | null>(null)
  const [projectFieldDraft, setProjectFieldDraft] = useState("")
  const [statusManagerOpen, setStatusManagerOpen] = useState(false)
  const [kanbanGroupBy, setKanbanGroupBy] = useState<"status" | "priority">(() => {
    if (typeof window === "undefined") return "status"
    return (localStorage.getItem(`kanban-groupby-${teamId}`) as "status" | "priority") ?? "status"
  })
  const [kanbanSimplified, setKanbanSimplified] = useState(() => {
    if (typeof window === "undefined") return true
    return localStorage.getItem(`kanban-simplified-${teamId}`) !== "false"
  })
  const [kanbanShowFields, setKanbanShowFields] = useState<string[]>(() => {
    if (typeof window === "undefined") return ["priority", "status"]
    try { return JSON.parse(localStorage.getItem(`kanban-fields-${teamId}`) ?? '["priority","status"]') } catch { return ["priority", "status"] }
  })
  const [dragOverColId, setDragOverColId] = useState<string | null>(null)
  const [dragOverDayKey, setDragOverDayKey] = useState<string | null>(null)
  const [dragOverBucketLabel, setDragOverBucketLabel] = useState<string | null>(null)
  const [kanbanFieldConfigOpen, setKanbanFieldConfigOpen] = useState(false)
  const [calendarShowFields, setCalendarShowFields] = useState<string[]>(() => {
    if (typeof window === "undefined") return ["status", "assignees"]
    try { return JSON.parse(localStorage.getItem(`cal-fields-${teamId}`) ?? '["status","assignees"]') } catch { return ["status", "assignees"] }
  })
  const [calendarFieldConfigOpen, setCalendarFieldConfigOpen] = useState(false)

  function setKanbanGroupByPersist(v: "status" | "priority") {
    setKanbanGroupBy(v)
    localStorage.setItem(`kanban-groupby-${teamId}`, v)
  }
  function setKanbanSimplifiedPersist(v: boolean) {
    setKanbanSimplified(v)
    localStorage.setItem(`kanban-simplified-${teamId}`, String(v))
  }
  function setKanbanShowFieldsPersist(v: string[]) {
    setKanbanShowFields(v)
    localStorage.setItem(`kanban-fields-${teamId}`, JSON.stringify(v))
  }

  const canManage = userRole === "ADMIN" || userRole === "LEADER"
  const activeProjects = projects.filter(p => !p.archived)
  const archivedProjects = projects.filter(p => p.archived)
  const selectedProject = projects.find(p => p.id === selectedId) ?? null

  // ── Project CRUD ──────────────────────────────────────────────────────────

  async function createProject() {
    if (!newProjectName.trim()) return
    const res = await fetch(`/api/teams/${teamId}/projects`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newProjectName.trim(), description: newProjectDesc.trim() || undefined }),
    })
    if (!res.ok) { toast.error("Failed to create project"); return }
    const project: TeamProject = await res.json()
    setProjects(prev => [...prev, { ...project, archived: false, comments: [] }])
    setSelectedId(project.id)
    setNewProjectName(""); setNewProjectDesc(""); setNewProjectOpen(false)
    toast.success("Project created")
  }

  async function archiveProject(id: string, archived: boolean) {
    const res = await fetch(`/api/teams/${teamId}/projects/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archived }),
    })
    if (res.ok) {
      setProjects(prev => prev.map(p => p.id === id ? { ...p, archived } : p))
      if (archived && selectedId === id) setSelectedId(activeProjects.find(p => p.id !== id)?.id ?? "standalone")
      toast.success(archived ? "Project archived" : "Project restored")
    }
  }

  async function deleteProject(id: string) {
    const res = await fetch(`/api/teams/${teamId}/projects/${id}`, { method: "DELETE" })
    if (!res.ok) { toast.error("Failed to delete project"); return }
    setProjects(prev => prev.filter(p => p.id !== id))
    if (selectedId === id) setSelectedId("standalone")
    toast.success("Project deleted")
  }

  async function patchProject(id: string, data: Record<string, unknown>) {
    const res = await fetch(`/api/teams/${teamId}/projects/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    if (res.ok) {
      const updated = await res.json()
      setProjects(prev => prev.map(p => p.id === id ? { ...p, ...updated } : p))
    }
  }

  // ── Task updates ──────────────────────────────────────────────────────────

  function applyTaskUpdate(updated: TeamTask) {
    setStandalones(prev => prev.map(t => t.id === updated.id ? updated : t))
    setProjects(prev => prev.map(p => ({ ...p, tasks: p.tasks.map(t => t.id === updated.id ? updated : t) })))
    if (selectedTask?.id === updated.id) setSelectedTask(updated)
  }

  function removeTask(taskId: string) {
    setStandalones(prev => prev.filter(t => t.id !== taskId))
    setProjects(prev => prev.map(p => ({ ...p, tasks: p.tasks.filter(t => t.id !== taskId) })))
    if (selectedTask?.id === taskId) setSelectedTask(null)
  }

  function restoreTask(task: TeamTask) {
    if (task.projectId) {
      setProjects(prev => prev.map(p => p.id === task.projectId ? { ...p, tasks: [...p.tasks, task] } : p))
    } else {
      setStandalones(prev => [...prev, task])
    }
  }

  async function patchTaskDate(taskId: string, dueDate: string | null) {
    const res = await fetch(`/api/teams/${teamId}/tasks/${taskId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dueDate }),
    })
    if (res.ok) applyTaskUpdate(await res.json())
  }

  async function toggleTask(taskId: string, done: boolean) {
    const res = await fetch(`/api/teams/${teamId}/tasks/${taskId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ done }),
    })
    if (res.ok) applyTaskUpdate(await res.json())
  }

  function deleteTask(taskId: string) {
    const snapshot =
      standalones.find(t => t.id === taskId) ??
      projects.flatMap(p => p.tasks).find(t => t.id === taskId) ?? null
    removeTask(taskId)
    const timer = setTimeout(() => {
      fetch(`/api/teams/${teamId}/tasks/${taskId}`, { method: "DELETE" })
      pendingDeletes.current.delete(taskId)
    }, 30000)
    pendingDeletes.current.set(taskId, { snapshot, timer })
    toast("Task deleted", {
      duration: 30000,
      action: {
        label: "Undo",
        onClick: () => {
          const pending = pendingDeletes.current.get(taskId)
          if (!pending) return
          clearTimeout(pending.timer)
          pendingDeletes.current.delete(taskId)
          if (pending.snapshot) restoreTask(pending.snapshot)
        },
      },
    })
  }

  function addTaskToProject(projectId: string, task: TeamTask) {
    setProjects(prev => prev.map(p => p.id === projectId ? { ...p, tasks: [...p.tasks, task] } : p))
  }

  async function addProjectComment(content: string, parentId?: string) {
    if (!selectedProject) return
    const res = await fetch(`/api/teams/${teamId}/projects/${selectedProject.id}/comments`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, parentId: parentId || null }),
    })
    if (!res.ok) { toast.error("Failed to post comment"); return }
    const comment = await res.json()
    setProjects(prev => prev.map(p => p.id === selectedProject.id ? { ...p, comments: [...p.comments, comment] } : p))
  }

  // ── Task view helpers ─────────────────────────────────────────────────────

  const taskCardProps = {
    statuses,
    teamId,
    onToggle: toggleTask,
    onDelete: deleteTask,
    onUpdate: applyTaskUpdate,
    onSelect: (task: TeamTask) => setSelectedTask(prev => prev?.id === task.id ? null : task),
  }

  function renderTaskListHeader() {
    return (
      <div className="flex items-center gap-3 px-3 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider border-b mb-1">
        <span className="flex-1">Task</span>
        <span className="w-28 shrink-0">Priority</span>
        <span className="w-32 shrink-0">Status</span>
        <span className="w-20 shrink-0">Due Date</span>
        <span className="w-24 shrink-0">Done</span>
      </div>
    )
  }

  function renderTaskList(tasks: TeamTask[]) {
    return (
      <>
        {renderTaskListHeader()}
        <div className="space-y-1.5">
        {sortTasks(tasks).map(task =>
          selectedTask?.id === task.id ? (
            <ExpandedTaskCard
              key={task.id}
              task={task}
              teamId={teamId}
              members={members}
              statuses={statuses}
              onClose={() => setSelectedTask(null)}
              onUpdate={applyTaskUpdate}
              onDelete={deleteTask}
            />
          ) : (
            <TaskCard key={task.id} task={task} {...taskCardProps} />
          )
        )}
      </div>
      </>
    )
  }

  function renderKanban(tasks: TeamTask[], projectId: string) {
    const PRIORITY_COLS = [
      { id: "urgent", name: "Urgent", color: "#ef4444" },
      { id: "high",   name: "High",   color: "#f97316" },
      { id: "medium", name: "Medium", color: "#eab308" },
      { id: "low",    name: "Low",    color: "#3b82f6" },
      { id: "none",   name: "None",   color: "#6b7280" },
    ]

    const cols = kanbanGroupBy === "priority"
      ? PRIORITY_COLS.map(p => ({ ...p, tasks: tasks.filter(t => (t.priority || "none") === p.id) }))
      : [
          { id: "none", name: "No Status", color: "#6b7280", tasks: tasks.filter(t => !t.statusId) },
          ...statuses.map(s => ({ id: s.id, name: s.name, color: s.color, tasks: tasks.filter(t => t.statusId === s.id) })),
        ]

    async function handleDrop(colId: string) {
      setDragOverColId(null)
      const taskId = dragTaskIdRef.current
      if (!taskId) return
      dragTaskIdRef.current = null
      const patchData = kanbanGroupBy === "priority"
        ? { priority: colId }
        : { statusId: colId === "none" ? null : colId }
      const res = await fetch(`/api/teams/${teamId}/tasks/${taskId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patchData),
      })
      if (res.ok) applyTaskUpdate(await res.json())
    }

    const FIELD_OPTIONS = [
      { id: "priority", label: "Priority" },
      { id: "status",   label: "Status" },
      { id: "dueDate",  label: "Due Date" },
      { id: "assignees", label: "Assignees" },
    ]

    return (
      <div className="space-y-3">
        {/* Kanban toolbar */}
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={kanbanGroupBy} onValueChange={v => setKanbanGroupByPersist(v as "status" | "priority")}>
            <SelectTrigger className="h-7 text-xs w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="status">Group by Status</SelectItem>
              <SelectItem value="priority">Group by Priority</SelectItem>
            </SelectContent>
          </Select>

          <button
            onClick={() => setKanbanSimplifiedPersist(!kanbanSimplified)}
            className={cn(
              "h-7 text-xs px-3 rounded-md border transition-colors",
              kanbanSimplified ? "bg-accent font-medium" : "hover:bg-accent/50"
            )}
          >
            {kanbanSimplified ? "Simplified" : "Detailed"}
          </button>

          {kanbanSimplified && (
            <Popover open={kanbanFieldConfigOpen} onOpenChange={setKanbanFieldConfigOpen}>
              <PopoverTrigger asChild>
                <button className="h-7 text-xs px-2 rounded-md border hover:bg-accent/50 transition-colors flex items-center gap-1">
                  <Settings2 className="h-3 w-3" /> Fields
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-44 p-2 space-y-1">
                {FIELD_OPTIONS.map(f => (
                  <label key={f.id} className="flex items-center gap-2 text-xs cursor-pointer py-0.5">
                    <input
                      type="checkbox"
                      checked={kanbanShowFields.includes(f.id)}
                      onChange={e => {
                        const next = e.target.checked
                          ? [...kanbanShowFields, f.id]
                          : kanbanShowFields.filter(x => x !== f.id)
                        setKanbanShowFieldsPersist(next)
                      }}
                      className="h-3 w-3"
                    />
                    {f.label}
                  </label>
                ))}
              </PopoverContent>
            </Popover>
          )}
        </div>

        {/* Columns */}
        <div className="flex gap-3 overflow-x-auto pb-2">
          {cols.map(col => (
            <div
              key={col.id}
              className={cn(
                "shrink-0 w-60 space-y-2 rounded-lg p-2 transition-colors",
                dragOverColId === col.id ? "bg-accent/40 ring-1 ring-primary/20" : "bg-muted/30"
              )}
              onDragOver={e => { e.preventDefault(); setDragOverColId(col.id) }}
              onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOverColId(null) }}
              onDrop={() => handleDrop(col.id)}
            >
              <div className="flex items-center gap-1.5 px-1">
                <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: col.color }} />
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex-1">{col.name}</span>
                <span className="text-xs text-muted-foreground">{col.tasks.length}</span>
              </div>
              <div className="space-y-1.5 min-h-[2rem]">
                {sortTasks(col.tasks).map(task => (
                  selectedTask?.id === task.id ? (
                    <ExpandedTaskCard
                      key={task.id}
                      task={task}
                      teamId={teamId}
                      members={members}
                      statuses={statuses}
                      onClose={() => setSelectedTask(null)}
                      onUpdate={applyTaskUpdate}
                      onDelete={deleteTask}
                    />
                  ) : (
                    <KanbanCard
                      key={task.id}
                      task={task}
                      simplified={kanbanSimplified}
                      showFields={kanbanShowFields}
                      onSelect={(t) => setSelectedTask(prev => prev?.id === t.id ? null : t)}
                      onToggle={toggleTask}
                      onDragStart={() => { dragTaskIdRef.current = task.id }}
                    />
                  )
                ))}
              </div>
              <AddTaskRow
                teamId={teamId}
                projectId={projectId}
                statusId={kanbanGroupBy === "status" && col.id !== "none" ? col.id : undefined}
                members={members}
                statuses={statuses}
                onAdd={(task) => addTaskToProject(projectId, task)}
              />
            </div>
          ))}
        </div>
      </div>
    )
  }

  function renderCalendar(tasks: TeamTask[]) {
    const year = calMonth.getFullYear()
    const month = calMonth.getMonth()
    const firstDayOfWeek = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"]
    const PRIORITY_DOT: Record<string, string> = {
      none: "bg-gray-300", low: "bg-blue-400", medium: "bg-yellow-400", high: "bg-orange-400", urgent: "bg-red-500",
    }
    const CAL_FIELD_OPTIONS = [
      { id: "priority", label: "Priority" },
      { id: "status",   label: "Status" },
      { id: "assignees", label: "Assignees" },
    ]

    const tasksByDate = new Map<string, TeamTask[]>()
    const noDueTasks: TeamTask[] = []
    for (const task of tasks) {
      if (!task.dueDate) { noDueTasks.push(task); continue }
      const key = toLocalDateString(task.dueDate)
      if (!tasksByDate.has(key)) tasksByDate.set(key, [])
      tasksByDate.get(key)!.push(task)
    }

    const todayStr = toLocalDateString(new Date())

    async function handleDayDrop(dateStr: string | null) {
      setDragOverDayKey(null)
      const taskId = dragTaskIdRef.current
      if (!taskId) return
      dragTaskIdRef.current = null
      await patchTaskDate(taskId, dateStr)
    }

    const cells: (number | null)[] = [
      ...Array(firstDayOfWeek).fill(null),
      ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
    ]
    while (cells.length % 7 !== 0) cells.push(null)

    function CalendarChip({ task }: { task: TeamTask }) {
      const isOpen = selectedTask?.id === task.id
      return (
        <Popover open={isOpen} onOpenChange={open => setSelectedTask(open ? task : null)}>
          <PopoverTrigger asChild>
            <div
              draggable
              onDragStart={e => { e.stopPropagation(); dragTaskIdRef.current = task.id; if (isOpen) setSelectedTask(null) }}
              onClick={e => e.stopPropagation()}
              className={cn(
                "flex items-center gap-1 rounded px-1 py-0.5 cursor-grab active:cursor-grabbing text-[10px] border transition-colors w-full",
                task.done
                  ? "opacity-50 bg-muted line-through text-muted-foreground border-transparent"
                  : "bg-card hover:bg-accent/50 border-border/60",
                isOpen && "ring-1 ring-primary border-primary"
              )}
            >
              {calendarShowFields.includes("priority") && (
                <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", PRIORITY_DOT[task.priority] ?? "bg-gray-300")} />
              )}
              <span className="truncate flex-1 leading-tight">{task.content}</span>
              {calendarShowFields.includes("status") && task.status && (
                <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: task.status.color }} />
              )}
              {calendarShowFields.includes("assignees") && task.assignees.length > 0 && (
                <Avatar className="h-3 w-3 shrink-0">
                  {task.assignees[0].user.avatar && <AvatarImage src={task.assignees[0].user.avatar} alt={task.assignees[0].user.name} />}
                  <AvatarFallback className="text-[5px]">{initials(task.assignees[0].user.name)}</AvatarFallback>
                </Avatar>
              )}
            </div>
          </PopoverTrigger>
          <PopoverContent
            side="bottom" align="start" sideOffset={4}
            className="w-72 p-0 shadow-xl overflow-hidden"
            onOpenAutoFocus={e => e.preventDefault()}
          >
            <ExpandedTaskCard task={task} teamId={teamId} members={members} statuses={statuses}
              onClose={() => setSelectedTask(null)}
              onUpdate={t => { applyTaskUpdate(t); setSelectedTask(t) }}
              onDelete={deleteTask} />
          </PopoverContent>
        </Popover>
      )
    }

    return (
      <div className="space-y-2">
        {/* Header + Fields toolbar */}
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setCalMonth(new Date(year, month - 1, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-semibold flex-1 text-center">{MONTHS[month]} {year}</span>
          <Popover open={calendarFieldConfigOpen} onOpenChange={setCalendarFieldConfigOpen}>
            <PopoverTrigger asChild>
              <button className="h-7 text-xs px-2 rounded-md border hover:bg-accent/50 transition-colors flex items-center gap-1">
                <Settings2 className="h-3 w-3" /> Fields
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-44 p-2 space-y-1" align="end">
              {CAL_FIELD_OPTIONS.map(f => (
                <label key={f.id} className="flex items-center gap-2 text-xs cursor-pointer py-0.5">
                  <input type="checkbox"
                    checked={calendarShowFields.includes(f.id)}
                    onChange={e => {
                      const next = e.target.checked
                        ? [...calendarShowFields, f.id]
                        : calendarShowFields.filter(x => x !== f.id)
                      setCalendarShowFields(next)
                      localStorage.setItem(`cal-fields-${teamId}`, JSON.stringify(next))
                    }}
                    className="h-3 w-3"
                  />
                  {f.label}
                </label>
              ))}
            </PopoverContent>
          </Popover>
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setCalMonth(new Date(year, month + 1, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Day-of-week labels + grid */}
        <div className="grid grid-cols-7 gap-px">
          {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d => (
            <div key={d} className="text-[10px] font-semibold text-muted-foreground text-center py-1 uppercase tracking-wide">{d}</div>
          ))}
          {cells.map((dayNum, i) => {
            if (!dayNum) return <div key={`pad-${i}`} className="min-h-[80px] bg-muted/10 rounded" />

            const key = `${year}-${String(month + 1).padStart(2,"0")}-${String(dayNum).padStart(2,"0")}`
            const dayTasks = tasksByDate.get(key) ?? []
            const isToday = key === todayStr
            const isPast = key < todayStr
            const isDragOver = dragOverDayKey === key

            return (
              <div key={key}
                className={cn(
                  "min-h-[80px] rounded border p-1 flex flex-col gap-0.5 transition-colors",
                  isToday ? "border-primary bg-primary/5" : isDragOver ? "border-primary/50 bg-accent/30" : "border-border/40 bg-card"
                )}
                onDragOver={e => { e.preventDefault(); setDragOverDayKey(key) }}
                onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOverDayKey(null) }}
                onDrop={() => handleDayDrop(key)}
              >
                <span className={cn(
                  "text-[11px] font-semibold self-end leading-none mb-0.5",
                  isToday ? "text-primary" : isPast ? "text-muted-foreground/50" : "text-muted-foreground"
                )}>
                  {dayNum}
                </span>
                {dayTasks.map(task => <CalendarChip key={task.id} task={task} />)}
                {isDragOver && dayTasks.length === 0 && (
                  <div className="flex-1 rounded border border-dashed border-primary/30 flex items-center justify-center text-[9px] text-muted-foreground min-h-[24px]">
                    Drop
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* No due date tray */}
        <div
          className={cn(
            "rounded-lg border transition-colors mt-1",
            dragOverDayKey === "none" ? "border-primary/40 bg-accent/20" : "border-dashed border-muted-foreground/30"
          )}
          onDragOver={e => { e.preventDefault(); setDragOverDayKey("none") }}
          onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOverDayKey(null) }}
          onDrop={() => handleDayDrop(null)}
        >
          <div className="px-2 py-1.5 flex items-center gap-2">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">No Due Date</span>
            {noDueTasks.length > 0 && <span className="text-[10px] text-muted-foreground">{noDueTasks.length}</span>}
          </div>
          {noDueTasks.length > 0 ? (
            <div className="px-2 pb-2 flex flex-wrap gap-1">
              {noDueTasks.map(task => <CalendarChip key={task.id} task={task} />)}
            </div>
          ) : (
            <div className="px-2 pb-2 text-center text-[10px] text-muted-foreground">Drag here to clear due date</div>
          )}
        </div>
      </div>
    )
  }

  function renderTimeline(tasks: TeamTask[]) {
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const todayStr = toLocalDateString(today)
    const in7  = new Date(today); in7.setDate(today.getDate() + 7)
    const in14 = new Date(today); in14.setDate(today.getDate() + 14)

    const buckets: { label: string; dot: string; dropDate: (() => string | null) | null; tasks: TeamTask[] }[] = [
      { label: "Overdue",     dot: "bg-red-500",    dropDate: null, tasks: [] },
      { label: "Today",       dot: "bg-orange-500", dropDate: () => todayStr, tasks: [] },
      { label: "This Week",   dot: "bg-yellow-500", dropDate: () => { const d = new Date(today); d.setDate(d.getDate() + 1); return toLocalDateString(d) }, tasks: [] },
      { label: "Next Week",   dot: "bg-blue-500",   dropDate: () => { const d = new Date(today); d.setDate(d.getDate() + 7); return toLocalDateString(d) }, tasks: [] },
      { label: "Later",       dot: "bg-green-500",  dropDate: () => { const d = new Date(today); d.setDate(d.getDate() + 14); return toLocalDateString(d) }, tasks: [] },
      { label: "No Due Date", dot: "bg-gray-400",   dropDate: () => null, tasks: [] },
    ]

    for (const task of tasks) {
      if (!task.dueDate) { buckets[5].tasks.push(task); continue }
      const d = new Date(task.dueDate); d.setHours(0, 0, 0, 0)
      const dStr = toLocalDateString(d)
      if (dStr < todayStr)        buckets[0].tasks.push(task)
      else if (dStr === todayStr) buckets[1].tasks.push(task)
      else if (d < in7)           buckets[2].tasks.push(task)
      else if (d < in14)          buckets[3].tasks.push(task)
      else                        buckets[4].tasks.push(task)
    }

    if (tasks.length === 0) return <div className="text-sm text-muted-foreground text-center py-8">No tasks</div>

    async function handleBucketDrop(bucket: typeof buckets[number]) {
      setDragOverBucketLabel(null)
      if (!bucket.dropDate) return
      const taskId = dragTaskIdRef.current
      if (!taskId) return
      dragTaskIdRef.current = null
      await patchTaskDate(taskId, bucket.dropDate())
    }

    return (
      <div className="space-y-3">
        {buckets.map(bucket => {
          const isDragOver = dragOverBucketLabel === bucket.label
          const isDroppable = !!bucket.dropDate

          return (
            <div key={bucket.label}
              className={cn(
                "rounded-lg border transition-colors",
                isDragOver && isDroppable ? "border-primary/40 bg-accent/20" : "border-border/50",
                !isDroppable && "opacity-90"
              )}
              onDragOver={e => { if (isDroppable) { e.preventDefault(); setDragOverBucketLabel(bucket.label) } }}
              onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOverBucketLabel(null) }}
              onDrop={() => handleBucketDrop(bucket)}
            >
              <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/30 rounded-t-lg">
                <span className={cn("h-2 w-2 rounded-full shrink-0", bucket.dot)} />
                <span className="text-xs font-semibold">{bucket.label}</span>
                <span className="text-xs text-muted-foreground">{bucket.tasks.length}</span>
                {!isDroppable && <span className="ml-auto text-[10px] text-muted-foreground italic">cannot reschedule here</span>}
              </div>
              {bucket.tasks.length > 0 ? (
                <div className="p-2 space-y-1.5">
                  {bucket.tasks.map(task => (
                    selectedTask?.id === task.id ? (
                      <ExpandedTaskCard key={task.id} task={task} teamId={teamId} members={members} statuses={statuses}
                        onClose={() => setSelectedTask(null)} onUpdate={applyTaskUpdate} onDelete={deleteTask} />
                    ) : (
                      <KanbanCard key={task.id} task={task} simplified={false} showFields={[]}
                        onSelect={t => setSelectedTask(prev => prev?.id === t.id ? null : t)}
                        onToggle={toggleTask}
                        onDragStart={() => { dragTaskIdRef.current = task.id }}
                      />
                    )
                  ))}
                </div>
              ) : isDragOver && isDroppable ? (
                <div className="px-2 pb-2 pt-1">
                  <div className="h-8 rounded border-2 border-dashed border-primary/30 flex items-center justify-center text-[10px] text-muted-foreground">
                    Drop to reschedule
                  </div>
                </div>
              ) : (
                <div className="px-3 py-2 text-[10px] text-muted-foreground">No tasks</div>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex gap-4 h-full min-h-[500px]">

      {/* ─ Left sidebar: project list ───────────────────────────────────── */}
      <div className="w-56 shrink-0 space-y-1">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Projects</span>
          <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => setNewProjectOpen(true)}>
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>

        {activeProjects.length === 0 && (
          <p className="text-xs text-muted-foreground px-2">No projects yet.</p>
        )}

        {activeProjects.map(p => (
          <div key={p.id}
            className={cn("group flex items-center gap-1.5 px-2 py-1.5 rounded-md cursor-pointer text-sm transition-colors",
              selectedId === p.id ? "bg-accent font-medium" : "hover:bg-accent/50")}
            onClick={() => setSelectedId(p.id)}
          >
            <FolderOpen className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span className="flex-1 truncate">{p.name}</span>
            <span className="text-xs text-muted-foreground tabular-nums">
              {p.tasks.filter(t => !t.done).length}
            </span>
            {canManage && (
              <button onClick={e => { e.stopPropagation(); archiveProject(p.id, true) }}
                className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground transition-all">
                <Archive className="h-3 w-3" />
              </button>
            )}
          </div>
        ))}

        {/* Archived */}
        {archivedProjects.length > 0 && (
          <div>
            <button onClick={() => setShowArchived(v => !v)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground px-2 py-1 transition-colors w-full">
              {showArchived ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              Archived ({archivedProjects.length})
            </button>
            {showArchived && archivedProjects.map(p => (
              <div key={p.id}
                className={cn("group flex items-center gap-1.5 px-2 py-1.5 rounded-md cursor-pointer text-sm opacity-60 transition-colors",
                  selectedId === p.id ? "bg-accent" : "hover:bg-accent/50")}
                onClick={() => setSelectedId(p.id)}
              >
                <FolderOpen className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="flex-1 truncate italic">{p.name}</span>
                <div className="opacity-0 group-hover:opacity-100 flex gap-1">
                  <button onClick={e => { e.stopPropagation(); archiveProject(p.id, false) }}
                    className="text-muted-foreground hover:text-foreground">
                    <ArchiveRestore className="h-3 w-3" />
                  </button>
                  <button onClick={e => { e.stopPropagation(); deleteProject(p.id) }}
                    className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Standalone tasks */}
        <div className="pt-2 border-t">
          <div
            className={cn("flex items-center gap-1.5 px-2 py-1.5 rounded-md cursor-pointer text-sm transition-colors",
              selectedId === "standalone" ? "bg-accent font-medium" : "hover:bg-accent/50")}
            onClick={() => setSelectedId("standalone")}
          >
            <List className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="flex-1">Standalone Tasks</span>
            <span className="text-xs text-muted-foreground">{standalones.filter(t => !t.done).length}</span>
          </div>
        </div>
      </div>

      {/* ─ Right panel ───────────────────────────────────────────────────── */}
      <div className="flex-1 min-w-0 overflow-y-auto flex flex-col gap-3">

        {!selectedId && (
          <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
            Select a project to view tasks
          </div>
        )}

        {selectedId === "standalone" && (
          <>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-sm">Standalone Tasks</h3>
              <div className="ml-auto flex items-center gap-1">
                {(["list", "calendar", "timeline"] as const).map(m => (
                  <Button key={m} size="sm" variant={viewMode === m ? "secondary" : "ghost"} className="h-7 px-2" onClick={() => setViewMode(m)}>
                    {m === "list" ? <List className="h-3.5 w-3.5" /> : m === "calendar" ? <CalendarDays className="h-3.5 w-3.5" /> : <GanttChart className="h-3.5 w-3.5" />}
                  </Button>
                ))}
              </div>
            </div>
            {viewMode === "list" && renderTaskList(standalones)}
            {viewMode === "calendar" && renderCalendar(standalones)}
            {viewMode === "timeline" && renderTimeline(standalones)}
            <AddTaskRow teamId={teamId} projectId={null} members={members} statuses={statuses}
              onAdd={task => setStandalones(prev => [...prev, task])} />
          </>
        )}

        {selectedProject && (
          <>
            {/* Project header */}
            <div className="flex items-start gap-2">
              <div className="flex-1 min-w-0 space-y-0.5">
                {/* Editable name */}
                {editingProjectField === "name" ? (
                  <Input
                    autoFocus
                    value={projectFieldDraft}
                    onChange={e => setProjectFieldDraft(e.target.value)}
                    onBlur={async () => {
                      if (projectFieldDraft.trim() && projectFieldDraft !== selectedProject.name)
                        await patchProject(selectedProject.id, { name: projectFieldDraft.trim() })
                      setEditingProjectField(null)
                    }}
                    onKeyDown={e => {
                      if (e.key === "Enter") (e.target as HTMLInputElement).blur()
                      if (e.key === "Escape") setEditingProjectField(null)
                    }}
                    className="h-7 text-sm font-semibold w-full max-w-xs"
                  />
                ) : (
                  <div className="flex items-center gap-2">
                    <h3
                      className="font-semibold text-sm cursor-text hover:underline"
                      onClick={() => { setProjectFieldDraft(selectedProject.name); setEditingProjectField("name") }}
                    >
                      {selectedProject.name}
                    </h3>
                    {selectedProject.archived && <Badge variant="outline" className="text-xs">Archived</Badge>}
                  </div>
                )}
                {/* Editable description */}
                {editingProjectField === "desc" ? (
                  <div className="flex gap-2 items-start">
                    <Textarea
                      autoFocus
                      value={projectFieldDraft}
                      onChange={e => setProjectFieldDraft(e.target.value)}
                      rows={2}
                      className="text-xs resize-none flex-1"
                      onKeyDown={e => {
                        if (e.key === "Escape") setEditingProjectField(null)
                      }}
                    />
                    <div className="flex flex-col gap-1">
                      <Button size="sm" className="h-6 text-xs px-2" onClick={async () => {
                        await patchProject(selectedProject.id, { description: projectFieldDraft.trim() || null })
                        setEditingProjectField(null)
                      }}>Save</Button>
                      <Button size="sm" variant="ghost" className="h-6 text-xs px-2" onClick={() => setEditingProjectField(null)}>Cancel</Button>
                    </div>
                  </div>
                ) : (
                  <p
                    className="text-xs text-muted-foreground cursor-text hover:text-foreground transition-colors min-h-[1rem]"
                    onClick={() => { setProjectFieldDraft(selectedProject.description ?? ""); setEditingProjectField("desc") }}
                  >
                    {selectedProject.description || <span className="italic opacity-50">Add description…</span>}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {canManage && (
                  <>
                    <Button size="sm" variant="ghost" className="h-7 text-xs px-2" onClick={() => setStatusManagerOpen(true)}>
                      <Settings2 className="h-3.5 w-3.5 mr-1" /> Statuses
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 text-xs px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => {
                        if (confirm(`Delete "${selectedProject.name}"? This cannot be undone.`))
                          deleteProject(selectedProject.id)
                      }}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </>
                )}
                {(["list", "kanban", "calendar", "timeline"] as const).map(m => (
                  <Button key={m} size="sm" variant={viewMode === m ? "secondary" : "ghost"} className="h-7 px-2" onClick={() => setViewMode(m)}>
                    {m === "list" ? <List className="h-3.5 w-3.5" /> : m === "kanban" ? <Columns className="h-3.5 w-3.5" /> : m === "calendar" ? <CalendarDays className="h-3.5 w-3.5" /> : <GanttChart className="h-3.5 w-3.5" />}
                  </Button>
                ))}
              </div>
            </div>

            {/* Task view */}
            {viewMode === "list" && (
              <>
                {renderTaskList(selectedProject.tasks)}
                {!selectedProject.archived && (
                  <AddTaskRow teamId={teamId} projectId={selectedProject.id} members={members} statuses={statuses}
                    onAdd={task => addTaskToProject(selectedProject.id, task)} />
                )}
              </>
            )}
            {viewMode === "kanban" && renderKanban(selectedProject.tasks, selectedProject.id)}
            {viewMode === "calendar" && renderCalendar(selectedProject.tasks)}
            {viewMode === "timeline" && renderTimeline(selectedProject.tasks)}

            {/* Project comments */}
            <div className="border-t pt-3 mt-2">
              <CommentsSection comments={selectedProject.comments} onAdd={addProjectComment} />
            </div>
          </>
        )}
      </div>

      {/* ─ New project dialog ───────────────────────────────────────────── */}
      <Dialog open={newProjectOpen} onOpenChange={o => { if (!o) { setNewProjectName(""); setNewProjectDesc("") } setNewProjectOpen(o) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>New Project</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Project name" value={newProjectName}
              onChange={e => setNewProjectName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && createProject()} autoFocus />
            <Textarea placeholder="Description (optional)" value={newProjectDesc}
              onChange={e => setNewProjectDesc(e.target.value)} rows={2} className="resize-none text-sm" />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setNewProjectOpen(false)}>Cancel</Button>
              <Button size="sm" onClick={createProject} disabled={!newProjectName.trim()}>Create</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─ Status manager dialog ─────────────────────────────────────────── */}
      <StatusManager
        open={statusManagerOpen}
        onClose={() => setStatusManagerOpen(false)}
        teamId={teamId}
        statuses={statuses}
        onUpdate={setStatuses}
      />
    </div>
  )
}
