"use client"

import { useState, useRef } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  Hash,
  Lock,
  Users,
  Plus,
  LogIn,
  ChevronDown,
  ChevronRight,
  MoreHorizontal,
  Pencil,
  Trash2,
  FolderPlus,
  Archive,
  ArchiveRestore,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import CreateChannelDialog from "./CreateChannelDialog"
import type { ChannelSummary, ChatCategoryItem } from "@/types/chat"
import { toast } from "sonner"

interface Props {
  channels: ChannelSummary[]
  archivedChannels: ChannelSummary[]
  teams: { id: string; name: string }[]
  categories: ChatCategoryItem[]
  currentUser: { id: string; role: string }
  activeChannelId?: string
  onChannelCreated: (c: ChannelSummary) => void
  onChannelJoined: (id: string) => void
  onChannelCategoryChanged: (channelId: string, categoryId: string | null) => void
  onCategoryCreated: (cat: ChatCategoryItem) => void
  onCategoryUpdated: (cat: ChatCategoryItem) => void
  onCategoryDeleted: (id: string) => void
  onChannelUnarchived: (id: string) => void
  onChannelReordered: (orderedIds: string[], categoryId: string | null) => void
}

function DefaultChannelIcon({ type }: { type: ChannelSummary["type"] }) {
  if (type === "PRIVATE") return <Lock className="h-3.5 w-3.5 shrink-0 opacity-50" />
  if (type === "TEAM") return <Users className="h-3.5 w-3.5 shrink-0 opacity-50" />
  return <Hash className="h-3.5 w-3.5 shrink-0 opacity-50" />
}

interface ChannelRowProps {
  channel: ChannelSummary
  isActive: boolean
  categories: ChatCategoryItem[]
  joiningId: string | null
  insertBefore?: boolean  // show blue line above
  insertAfter?: boolean   // show blue line below
  onJoin: (id: string) => void
  onMoveTo: (channelId: string, categoryId: string | null) => void
  onDragStart: (channelId: string) => void
  onDragOver: (e: React.DragEvent, channelId: string) => void
  onDragLeave: () => void
}

function ChannelRow({
  channel,
  isActive,
  categories,
  joiningId,
  insertBefore,
  insertAfter,
  onJoin,
  onMoveTo,
  onDragStart,
  onDragOver,
  onDragLeave,
}: ChannelRowProps) {
  return (
    <div
      className={cn(
        "relative flex items-center group pr-1",
        insertBefore && "before:absolute before:top-0 before:left-0 before:right-0 before:h-0.5 before:bg-primary before:rounded-full",
        insertAfter  && "after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-primary after:rounded-full",
      )}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("channelId", channel.id)
        e.dataTransfer.effectAllowed = "move"
        onDragStart(channel.id)
      }}
      onDragOver={(e) => onDragOver(e, channel.id)}
      onDragLeave={onDragLeave}
    >
      <Link
        href={`/mychurch/chat/${channel.id}`}
        className={cn(
          "flex-1 flex items-center gap-1.5 px-2 py-1 rounded text-sm transition-colors truncate min-w-0 cursor-pointer select-none",
          isActive
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
        )}
      >
        {channel.icon ? (
          <span className="text-base leading-none shrink-0">{channel.icon}</span>
        ) : (
          <DefaultChannelIcon type={channel.type} />
        )}
        <span className="truncate">{channel.name}</span>
      </Link>

      {!channel.isMember && channel.type === "PUBLIC" && (
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5 opacity-0 group-hover:opacity-100 shrink-0"
          title="Join"
          disabled={joiningId === channel.id}
          onClick={() => onJoin(channel.id)}
        >
          <LogIn className="h-3 w-3" />
        </Button>
      )}

      {channel.isMember && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 opacity-0 group-hover:opacity-100 shrink-0"
            >
              <MoreHorizontal className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <p className="px-2 py-1 text-xs text-muted-foreground font-medium">Move to section</p>
            <DropdownMenuSeparator />
            {channel.categoryId && (
              <DropdownMenuItem onClick={() => onMoveTo(channel.id, null)}>
                No section
              </DropdownMenuItem>
            )}
            {categories.map((cat) =>
              cat.id !== channel.categoryId ? (
                <DropdownMenuItem key={cat.id} onClick={() => onMoveTo(channel.id, cat.id)}>
                  {cat.name}
                </DropdownMenuItem>
              ) : null
            )}
            {categories.length === 0 && (
              <p className="px-2 py-1 text-xs text-muted-foreground">No sections yet</p>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  )
}

interface CategorySectionProps {
  category: ChatCategoryItem
  channels: ChannelSummary[]
  allCategories: ChatCategoryItem[]
  activeChannelId?: string
  joiningId: string | null
  isDragOver: boolean
  channelInsertTarget: { channelId: string; position: "before" | "after" } | null
  onJoin: (id: string) => void
  onMoveTo: (channelId: string, categoryId: string | null) => void
  onReorder: (groupChannelIds: string[], movedId: string, targetId: string, position: "before" | "after") => void
  onRename: (id: string, name: string) => void
  onDelete: (id: string) => void
  onToggleCollapse: (id: string, collapsed: boolean) => void
  onDragStart: (channelId: string) => void
  onChannelDragOver: (e: React.DragEvent, channelId: string) => void
  onSectionDragOver: (e: React.DragEvent, categoryId: string) => void
  onDrop: (e: React.DragEvent, categoryId: string) => void
  onDragLeave: () => void
}

function CategorySection({
  category,
  channels,
  allCategories,
  activeChannelId,
  joiningId,
  isDragOver,
  channelInsertTarget,
  onJoin,
  onMoveTo,
  onReorder,
  onRename,
  onDelete,
  onToggleCollapse,
  onDragStart,
  onChannelDragOver,
  onSectionDragOver,
  onDrop,
  onDragLeave,
}: CategorySectionProps) {
  const [editing, setEditing] = useState(false)
  const [nameInput, setNameInput] = useState(category.name)
  const inputRef = useRef<HTMLInputElement>(null)
  const goingToEditRef = useRef(false)

  function startEdit() {
    goingToEditRef.current = true
    setNameInput(category.name)
    setEditing(true)
  }

  function submitRename() {
    if (nameInput.trim() && nameInput.trim() !== category.name) {
      onRename(category.id, nameInput.trim())
    }
    setEditing(false)
  }

  return (
    <div
      className={cn(
        "mb-2 rounded-md transition-colors",
        isDragOver && !channelInsertTarget && "bg-primary/10 ring-1 ring-primary/30"
      )}
      onDragOver={(e) => onSectionDragOver(e, category.id)}
      onDrop={(e) => onDrop(e, category.id)}
      onDragLeave={onDragLeave}
    >
      <div className="flex items-center group/cat px-1">
        {editing ? (
          /* Input must NOT be inside a <button> — invalid HTML, can't focus */
          <div className="flex-1 flex items-center gap-1 py-0.5">
            {category.collapsed
              ? <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" />
              : <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />}
            <Input
              ref={inputRef}
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              className="h-6 text-xs px-1 py-0 font-semibold uppercase tracking-wider flex-1 min-w-0"
              onKeyDown={(e) => {
                if (e.key === "Enter") { e.preventDefault(); submitRename() }
                if (e.key === "Escape") setEditing(false)
              }}
              onBlur={submitRename}
            />
          </div>
        ) : (
          <button
            className="flex-1 flex items-center gap-1 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors truncate"
            onClick={() => onToggleCollapse(category.id, !category.collapsed)}
          >
            {category.collapsed
              ? <ChevronRight className="h-3 w-3 shrink-0" />
              : <ChevronDown className="h-3 w-3 shrink-0" />}
            <span className="truncate">{category.name}</span>
          </button>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 opacity-0 group-hover/cat:opacity-100 shrink-0"
            >
              <MoreHorizontal className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-40"
            onCloseAutoFocus={(e) => {
              if (goingToEditRef.current) {
                e.preventDefault()
                goingToEditRef.current = false
                // Focus the input after Radix finishes closing
                setTimeout(() => { inputRef.current?.focus(); inputRef.current?.select() }, 0)
              }
            }}
          >
            <DropdownMenuItem onClick={startEdit}>
              <Pencil className="h-3.5 w-3.5 mr-2" /> Rename
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => onDelete(category.id)}
            >
              <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete section
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {!category.collapsed && (
        <div className="space-y-0.5 ml-1 min-h-[4px]">
          {channels.map((c) => (
            <ChannelRow
              key={c.id}
              channel={c}
              isActive={activeChannelId === c.id}
              categories={allCategories}
              joiningId={joiningId}
              insertBefore={channelInsertTarget?.channelId === c.id && channelInsertTarget.position === "before"}
              insertAfter={channelInsertTarget?.channelId === c.id && channelInsertTarget.position === "after"}
              onJoin={onJoin}
              onMoveTo={onMoveTo}
              onDragStart={onDragStart}
              onDragOver={onChannelDragOver}
              onDragLeave={onDragLeave}
            />
          ))}
          {channels.length === 0 && !isDragOver && (
            <p className="px-3 py-1 text-xs text-muted-foreground italic">Empty — drag channels here</p>
          )}
        </div>
      )}
    </div>
  )
}

export default function ChatSidebar({
  channels,
  archivedChannels,
  teams,
  categories,
  currentUser,
  activeChannelId,
  onChannelCreated,
  onChannelJoined,
  onChannelCategoryChanged,
  onCategoryCreated,
  onCategoryUpdated,
  onCategoryDeleted,
  onChannelUnarchived,
  onChannelReordered,
}: Props) {
  const router = useRouter()
  const [createOpen, setCreateOpen] = useState(false)
  const [joiningId, setJoiningId] = useState<string | null>(null)
  const [dragOverTarget, setDragOverTarget] = useState<string | null>(null) // categoryId or "uncategorized"
  const [channelInsertTarget, setChannelInsertTarget] = useState<{ channelId: string; position: "before" | "after"; groupKey: string } | null>(null)
  const [archivedCollapsed, setArchivedCollapsed] = useState(true)
  const [unarchivedId, setUnarchivedId] = useState<string | null>(null)
  const draggingIdRef = useRef<string | null>(null)

  async function handleJoin(channelId: string) {
    setJoiningId(channelId)
    try {
      await fetch(`/api/channels/${channelId}/join`, { method: "POST" })
      onChannelJoined(channelId)
      router.push(`/mychurch/chat/${channelId}`)
    } catch {
      toast.error("Failed to join channel")
    } finally {
      setJoiningId(null)
    }
  }

  async function handleMoveTo(channelId: string, categoryId: string | null) {
    const res = await fetch(`/api/channels/${channelId}/membership`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categoryId }),
    })
    if (!res.ok) { toast.error("Failed to move channel"); return }
    onChannelCategoryChanged(channelId, categoryId)
  }

  function handleSectionDragOver(e: React.DragEvent, target: string) {
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = "move"
    setDragOverTarget(target)
  }

  function handleChannelDragOver(e: React.DragEvent, targetChannelId: string) {
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = "move"
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const midY = rect.top + rect.height / 2
    const position: "before" | "after" = e.clientY < midY ? "before" : "after"
    // Determine which group this channel belongs to
    const ch = channels.find((c) => c.id === targetChannelId)
    const groupKey = ch?.categoryId ?? "uncategorized"
    setChannelInsertTarget({ channelId: targetChannelId, position, groupKey })
    setDragOverTarget(null)
  }

  function handleDrop(e: React.DragEvent, categoryId: string | null) {
    e.preventDefault()
    const channelId = e.dataTransfer.getData("channelId")
    const insert = channelInsertTarget
    setDragOverTarget(null)
    setChannelInsertTarget(null)
    draggingIdRef.current = null
    if (!channelId) return

    const ch = channels.find((c) => c.id === channelId)
    if (!ch) return

    if (insert) {
      // Reorder within the same group or move+reorder to a new group
      const groupKey = insert.groupKey
      const targetCategoryId = groupKey === "uncategorized" ? null : groupKey
      const groupChannels = channels
        .filter((c) => (c.categoryId ?? "uncategorized") === groupKey && c.id !== channelId)
      const targetIdx = groupChannels.findIndex((c) => c.id === insert.channelId)
      const insertIdx = insert.position === "before" ? targetIdx : targetIdx + 1
      const newOrder = [...groupChannels]
      newOrder.splice(insertIdx, 0, ch)
      const newIds = newOrder.map((c) => c.id)

      if (ch.categoryId !== targetCategoryId) {
        handleMoveTo(channelId, targetCategoryId)
      }
      fetch("/api/channels/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelIds: newIds }),
      })
      // Optimistic update: update order in state
      onChannelReordered(newIds, targetCategoryId)
    } else {
      // Dropped on section header / empty area — just change category if needed
      if (ch.categoryId !== categoryId) handleMoveTo(channelId, categoryId)
    }
  }

  function handleDragLeave() {
    setDragOverTarget(null)
    setChannelInsertTarget(null)
  }

  async function handleAddSection() {
    const res = await fetch("/api/chat-categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "New Section" }),
    })
    if (!res.ok) { toast.error("Failed to create section"); return }
    const cat = await res.json()
    onCategoryCreated({ id: cat.id, name: cat.name, order: cat.order, collapsed: cat.collapsed })
  }

  async function handleRename(id: string, name: string) {
    const res = await fetch(`/api/chat-categories/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    })
    if (!res.ok) { toast.error("Failed to rename section"); return }
    const updated = await res.json()
    onCategoryUpdated({ id: updated.id, name: updated.name, order: updated.order, collapsed: updated.collapsed })
  }

  async function handleDeleteCategory(id: string) {
    const res = await fetch(`/api/chat-categories/${id}`, { method: "DELETE" })
    if (!res.ok) { toast.error("Failed to delete section"); return }
    onCategoryDeleted(id)
  }

  async function handleUnarchive(channelId: string) {
    setUnarchivedId(channelId)
    try {
      const res = await fetch(`/api/channels/${channelId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archived: false }),
      })
      if (!res.ok) { toast.error("Failed to unarchive channel"); return }
      onChannelUnarchived(channelId)
      toast.success("Channel unarchived")
    } catch {
      toast.error("Failed to unarchive channel")
    } finally {
      setUnarchivedId(null)
    }
  }

  async function handleToggleCollapse(id: string, collapsed: boolean) {
    onCategoryUpdated({ ...categories.find((c) => c.id === id)!, collapsed })
    await fetch(`/api/chat-categories/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ collapsed }),
    })
  }

  // Partition channels (already sorted by order from server/state)
  const categorized = new Map<string, ChannelSummary[]>()
  for (const cat of categories) categorized.set(cat.id, [])
  const uncategorized: ChannelSummary[] = []
  for (const ch of channels) {
    if (ch.categoryId && categorized.has(ch.categoryId)) {
      categorized.get(ch.categoryId)!.push(ch)
    } else {
      uncategorized.push(ch)
    }
  }

  return (
    <aside className="w-56 bg-muted/50 border-r flex flex-col shrink-0">
      <div className="p-3 border-b flex items-center justify-between">
        <p className="font-semibold text-sm">Chat</p>
        <div className="flex items-center gap-0.5">
          <Button variant="ghost" size="icon" className="h-6 w-6" title="Add section" onClick={handleAddSection}>
            <FolderPlus className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6" title="New channel" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div
        className="flex-1 overflow-y-auto p-2 pt-2"
        onDragEnd={() => { setDragOverTarget(null); setChannelInsertTarget(null); draggingIdRef.current = null }}
      >
        {/* User-defined category sections */}
        {categories.map((cat) => (
          <CategorySection
            key={cat.id}
            category={cat}
            channels={categorized.get(cat.id) ?? []}
            allCategories={categories}
            activeChannelId={activeChannelId}
            joiningId={joiningId}
            isDragOver={dragOverTarget === cat.id}
            channelInsertTarget={channelInsertTarget?.groupKey === cat.id ? channelInsertTarget : null}
            onJoin={handleJoin}
            onMoveTo={handleMoveTo}
            onReorder={() => {}}
            onRename={handleRename}
            onDelete={handleDeleteCategory}
            onToggleCollapse={handleToggleCollapse}
            onDragStart={(id) => { draggingIdRef.current = id }}
            onChannelDragOver={handleChannelDragOver}
            onSectionDragOver={handleSectionDragOver}
            onDrop={(e) => handleDrop(e, cat.id)}
            onDragLeave={handleDragLeave}
          />
        ))}

        {/* Uncategorized / Other */}
        {uncategorized.length > 0 && (
          <div
            className={cn(
              "space-y-0.5 rounded-md transition-colors",
              categories.length > 0 && "mt-1",
              dragOverTarget === "uncategorized" && !channelInsertTarget && "bg-primary/10 ring-1 ring-primary/30"
            )}
            onDragOver={(e) => handleSectionDragOver(e, "uncategorized")}
            onDrop={(e) => handleDrop(e, null)}
            onDragLeave={handleDragLeave}
          >
            {categories.length > 0 && (
              <p className="px-2 pb-0.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Other
              </p>
            )}
            {uncategorized.map((c) => (
              <ChannelRow
                key={c.id}
                channel={c}
                isActive={activeChannelId === c.id}
                categories={categories}
                joiningId={joiningId}
                insertBefore={channelInsertTarget?.channelId === c.id && channelInsertTarget.position === "before"}
                insertAfter={channelInsertTarget?.channelId === c.id && channelInsertTarget.position === "after"}
                onJoin={handleJoin}
                onMoveTo={handleMoveTo}
                onDragStart={(id) => { draggingIdRef.current = id }}
                onDragOver={handleChannelDragOver}
                onDragLeave={handleDragLeave}
              />
            ))}
          </div>
        )}

        {channels.length === 0 && (
          <p className="text-xs text-muted-foreground px-2 mt-2">No channels yet. Create one!</p>
        )}

        {/* Archived section */}
        {archivedChannels.length > 0 && (
          <div className="mt-3 border-t pt-2">
            <button
              className="flex w-full items-center gap-1 px-1 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
              onClick={() => setArchivedCollapsed((v) => !v)}
            >
              {archivedCollapsed
                ? <ChevronRight className="h-3 w-3 shrink-0" />
                : <ChevronDown className="h-3 w-3 shrink-0" />}
              <Archive className="h-3 w-3 shrink-0" />
              Archived ({archivedChannels.length})
            </button>
            {!archivedCollapsed && (
              <div className="space-y-0.5 ml-1 mt-0.5">
                {archivedChannels.map((c) => (
                  <div key={c.id} className="flex items-center group/arc pr-1">
                    <Link
                      href={`/mychurch/chat/${c.id}`}
                      className={cn(
                        "flex-1 flex items-center gap-1.5 px-2 py-1 rounded text-sm transition-colors truncate min-w-0 opacity-60",
                        activeChannelId === c.id
                          ? "bg-primary text-primary-foreground opacity-100"
                          : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
                      )}
                    >
                      {c.icon ? (
                        <span className="text-base leading-none shrink-0">{c.icon}</span>
                      ) : (
                        <DefaultChannelIcon type={c.type} />
                      )}
                      <span className="truncate">{c.name}</span>
                    </Link>
                    <button
                      title="Unarchive"
                      disabled={unarchivedId === c.id}
                      className="h-5 w-5 flex items-center justify-center opacity-0 group-hover/arc:opacity-100 text-muted-foreground hover:text-foreground transition-colors shrink-0"
                      onClick={() => handleUnarchive(c.id)}
                    >
                      <ArchiveRestore className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <CreateChannelDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        teams={teams}
        onCreated={(c) => {
          onChannelCreated(c)
          router.push(`/mychurch/chat/${c.id}`)
        }}
      />
    </aside>
  )
}
