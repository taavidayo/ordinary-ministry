"use client"

import { useState } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ChevronLeft, Plus, Pencil, Trash2, Archive, ArchiveRestore, X } from "lucide-react"
import RichTextarea from "@/components/admin/RichTextarea"

interface Broadcast {
  id: string
  title: string
  content: string
  tags: string[]
  categoryId: string | null
  archivedAt: string | null
  author: { id: string; name: string; avatar: string | null }
  category: { id: string; name: string } | null
  createdAt: string
  updatedAt: string
}

interface Category { id: string; name: string }

interface Props {
  categories: Category[]
  initialBroadcasts: Broadcast[]
}

function BroadcastCard({ broadcast: b, categories, onUpdate, onArchive, onDelete }: {
  broadcast: Broadcast
  categories: Category[]
  onUpdate: (b: Broadcast) => void
  onArchive: () => void
  onDelete: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(b.title)
  const [editContent, setEditContent] = useState(b.content)
  const [editTags, setEditTags] = useState<string[]>(b.tags)
  const [editTagInput, setEditTagInput] = useState("")
  const [editCategoryId, setEditCategoryId] = useState(b.categoryId ?? "all")
  const [saving, setSaving] = useState(false)

  function addEditTag(e: React.KeyboardEvent<HTMLInputElement>) {
    if ((e.key === "Enter" || e.key === ",") && editTagInput.trim()) {
      e.preventDefault()
      const tag = editTagInput.trim().toLowerCase().replace(/,/g, "")
      if (!editTags.includes(tag)) setEditTags((prev) => [...prev, tag])
      setEditTagInput("")
    }
  }

  async function save() {
    setSaving(true)
    const res = await fetch(`/api/group-broadcasts/${b.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: editTitle.trim(),
        content: editContent.trim(),
        tags: editTags,
        categoryId: editCategoryId === "all" ? null : editCategoryId,
      }),
    })
    setSaving(false)
    if (res.ok) {
      onUpdate(await res.json())
      setEditing(false)
      toast.success("Updated")
    } else {
      toast.error("Failed to update")
    }
  }

  // Strip HTML tags for plain-text preview
  const preview = b.content
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 180)

  if (editing) {
    return (
      <div className="border rounded-xl p-4 space-y-3 bg-card ring-1 ring-primary/20">
        <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
        <RichTextarea value={editContent} onChange={setEditContent} minRows={4} showFileUpload />
        <div className="space-y-1">
          <div className="flex flex-wrap gap-1.5">
            {editTags.map((t) => (
              <span key={t} className="inline-flex items-center gap-1 text-xs bg-secondary px-2 py-0.5 rounded-full">
                {t}
                <button type="button" onClick={() => setEditTags((prev) => prev.filter((x) => x !== t))}><X className="h-3 w-3" /></button>
              </span>
            ))}
          </div>
          <Input placeholder="Add tag (press Enter)" value={editTagInput} onChange={(e) => setEditTagInput(e.target.value)} onKeyDown={addEditTag} className="h-7 text-sm" />
        </div>
        <div className="flex items-center gap-2">
          <Select value={editCategoryId} onValueChange={setEditCategoryId}>
            <SelectTrigger className="h-8 text-sm flex-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Groups</SelectItem>
              {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={save} disabled={saving}>Save</Button>
          <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
        </div>
      </div>
    )
  }

  return (
    <div className={`border rounded-xl p-4 space-y-2 bg-card ${b.archivedAt ? "opacity-60" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            {b.category ? (
              <span className="text-[10px] font-medium bg-secondary px-2 py-0.5 rounded-full">{b.category.name}</span>
            ) : (
              <span className="text-[10px] font-medium bg-secondary px-2 py-0.5 rounded-full">All Groups</span>
            )}
            {b.archivedAt && (
              <span className="text-[10px] font-medium bg-muted text-muted-foreground px-2 py-0.5 rounded-full">Archived</span>
            )}
          </div>
          <h3 className="font-semibold text-sm">{b.title}</h3>
        </div>
        <div className="flex gap-0.5 shrink-0">
          <Button size="icon" variant="ghost" className="h-7 w-7" title="Edit" onClick={() => setEditing(true)}><Pencil className="h-3.5 w-3.5" /></Button>
          <Button size="icon" variant="ghost" className="h-7 w-7" title={b.archivedAt ? "Unarchive" : "Archive"} onClick={onArchive}>
            {b.archivedAt ? <ArchiveRestore className="h-3.5 w-3.5" /> : <Archive className="h-3.5 w-3.5" />}
          </Button>
          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" title="Delete" onClick={onDelete}><Trash2 className="h-3.5 w-3.5" /></Button>
        </div>
      </div>
      <p className="text-sm text-muted-foreground line-clamp-2">{preview}</p>
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1">
          {b.tags.map((t) => (
            <span key={t} className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full">{t}</span>
          ))}
        </div>
        <p className="text-xs text-muted-foreground shrink-0">{b.author.name} · {new Date(b.createdAt).toLocaleDateString()}</p>
      </div>
    </div>
  )
}

export default function BroadcastsDashboard({ categories, initialBroadcasts }: Props) {
  const [broadcasts, setBroadcasts] = useState(initialBroadcasts)
  const [showCreate, setShowCreate] = useState(false)
  const [filterTab, setFilterTab] = useState<"active" | "archived">("active")
  const [filterTag, setFilterTag] = useState<string | null>(null)

  // Create form state
  const [newTitle, setNewTitle] = useState("")
  const [newContent, setNewContent] = useState("")
  const [newCategoryId, setNewCategoryId] = useState("all")
  const [newTags, setNewTags] = useState<string[]>([])
  const [newTagInput, setNewTagInput] = useState("")
  const [creating, setCreating] = useState(false)

  // Derive all unique tags from broadcasts for filter chips
  const allTags = Array.from(new Set(broadcasts.flatMap((b) => b.tags))).sort()

  const visible = broadcasts.filter((b) => {
    const archivedMatch = filterTab === "archived" ? !!b.archivedAt : !b.archivedAt
    const tagMatch = !filterTag || b.tags.includes(filterTag)
    return archivedMatch && tagMatch
  })

  function addNewTag(e: React.KeyboardEvent<HTMLInputElement>) {
    if ((e.key === "Enter" || e.key === ",") && newTagInput.trim()) {
      e.preventDefault()
      const tag = newTagInput.trim().toLowerCase().replace(/,/g, "")
      if (!newTags.includes(tag)) setNewTags((prev) => [...prev, tag])
      setNewTagInput("")
    }
  }

  async function create() {
    if (!newTitle.trim() || !newContent.trim()) { toast.error("Title and content required"); return }
    setCreating(true)
    const res = await fetch("/api/group-broadcasts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: newTitle.trim(),
        content: newContent.trim(),
        categoryId: newCategoryId === "all" ? null : newCategoryId,
        tags: newTags,
      }),
    })
    setCreating(false)
    if (res.ok) {
      const b = await res.json()
      setBroadcasts((prev) => [b, ...prev])
      setNewTitle(""); setNewContent(""); setNewCategoryId("all"); setNewTags([]); setShowCreate(false)
      toast.success("Broadcast posted")
    } else {
      toast.error("Failed to post broadcast")
    }
  }

  async function archive(id: string, currently: boolean) {
    const res = await fetch(`/api/group-broadcasts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archivedAt: currently ? null : new Date().toISOString() }),
    })
    if (res.ok) {
      const b = await res.json()
      setBroadcasts((prev) => prev.map((x) => x.id === id ? b : x))
      toast.success(currently ? "Broadcast restored" : "Broadcast archived")
    }
  }

  async function deleteBroadcast(id: string) {
    const res = await fetch(`/api/group-broadcasts/${id}`, { method: "DELETE" })
    if (res.ok || res.status === 204) {
      setBroadcasts((prev) => prev.filter((b) => b.id !== id))
      toast.success("Deleted")
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/mychurch/groups">
            <Button variant="ghost" size="icon" className="h-8 w-8"><ChevronLeft className="h-4 w-4" /></Button>
          </Link>
          <h1 className="text-2xl font-bold">Broadcasts</h1>
        </div>
        <Button onClick={() => setShowCreate((v) => !v)}>
          <Plus className="h-4 w-4 mr-1" /> New Broadcast
        </Button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="border rounded-xl p-4 space-y-3 bg-card">
          <h2 className="font-semibold text-sm">New Broadcast</h2>
          <Input placeholder="Title" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
          <RichTextarea value={newContent} onChange={setNewContent} placeholder="Write your message..." minRows={4} showFileUpload />
          {/* Tags */}
          <div className="space-y-1">
            <div className="flex flex-wrap gap-1.5">
              {newTags.map((t) => (
                <span key={t} className="inline-flex items-center gap-1 text-xs bg-secondary px-2 py-0.5 rounded-full">
                  {t}
                  <button type="button" onClick={() => setNewTags((prev) => prev.filter((x) => x !== t))}><X className="h-3 w-3" /></button>
                </span>
              ))}
            </div>
            <Input
              placeholder="Add tag (press Enter)"
              value={newTagInput}
              onChange={(e) => setNewTagInput(e.target.value)}
              onKeyDown={addNewTag}
              className="h-7 text-sm"
            />
          </div>
          {/* Category + send */}
          <div className="flex items-center gap-2">
            <Select value={newCategoryId} onValueChange={setNewCategoryId}>
              <SelectTrigger className="h-8 text-sm flex-1">
                <SelectValue placeholder="Send to..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Groups</SelectItem>
                {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button size="sm" onClick={create} disabled={creating}>Post</Button>
            <Button size="sm" variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {/* Filter bar */}
      <div className="space-y-2">
        <div className="flex gap-2">
          {(["active", "archived"] as const).map((tab) => (
            <button key={tab} onClick={() => setFilterTab(tab)}
              className={`text-xs px-3 py-1 rounded-full border transition-colors ${filterTab === tab ? "bg-primary text-primary-foreground border-primary" : "hover:bg-accent"}`}>
              {tab === "active" ? "Active" : "Archived"}
            </button>
          ))}
        </div>
        {allTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            <button onClick={() => setFilterTag(null)}
              className={`text-xs px-2.5 py-0.5 rounded-full border transition-colors ${!filterTag ? "bg-secondary" : "hover:bg-accent"}`}>
              All tags
            </button>
            {allTags.map((tag) => (
              <button key={tag} onClick={() => setFilterTag(filterTag === tag ? null : tag)}
                className={`text-xs px-2.5 py-0.5 rounded-full border transition-colors ${filterTag === tag ? "bg-secondary" : "hover:bg-accent"}`}>
                {tag}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Broadcast cards */}
      {visible.length === 0 ? (
        <p className="text-muted-foreground text-sm py-8 text-center">
          {filterTab === "archived" ? "No archived broadcasts." : "No broadcasts yet. Create one above."}
        </p>
      ) : (
        <div className="space-y-4">
          {visible.map((b) => (
            <BroadcastCard
              key={b.id}
              broadcast={b}
              categories={categories}
              onUpdate={(updated) => setBroadcasts((prev) => prev.map((x) => x.id === updated.id ? updated : x))}
              onArchive={() => archive(b.id, !!b.archivedAt)}
              onDelete={() => deleteBroadcast(b.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
