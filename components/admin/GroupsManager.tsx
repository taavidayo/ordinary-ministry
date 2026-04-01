"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Plus, Users, MessageSquare, LayoutDashboard, Settings, Tags, Pencil, Trash2, X, Archive, ArchiveRestore, ChevronDown, Megaphone,
} from "lucide-react"

interface User { id: string; name: string; email: string; avatar: string | null }
interface Category { id: string; name: string }
interface Channel { id: string; name: string }
interface GroupMember { user: User; role: string }
interface Group {
  id: string
  name: string
  description: string | null
  imageUrl: string | null
  groupType: string | null
  showOnFrontPage: boolean
  archivedAt: string | null
  categoryId: string | null
  category: Category | null
  members: GroupMember[]
  channels: Channel[]
}


interface Props {
  groups: Group[]
  categories: Category[]
  allUsers: User[]
  sessionRole?: string
}

function initials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)
}


function GroupCard({ group, onNavigate }: { group: Group; onNavigate: () => void }) {
  const leaders = group.members.filter((m) => m.role === "LEADER")
  return (
    <div
      onClick={onNavigate}
      className="rounded-xl border bg-card shadow-sm hover:shadow-md transition-shadow flex flex-col cursor-pointer"
    >
      {group.imageUrl && (
        <div className="h-28 rounded-t-xl overflow-hidden bg-muted">
          <img src={group.imageUrl} alt={group.name} className="w-full h-full object-cover" />
        </div>
      )}
      <div className="p-5 flex-1">
        {group.category && (
          <span className="text-[10px] font-medium text-muted-foreground bg-secondary px-2 py-0.5 rounded-full mb-1.5 inline-block">
            {group.category.name}
          </span>
        )}
        <div className="flex items-start justify-between gap-2">
          <h2 className="font-semibold text-base leading-tight">{group.name}</h2>
          <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
            <Users className="h-3.5 w-3.5" />
            {group.members.length}
          </div>
        </div>
        {group.groupType && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{group.groupType}</p>
        )}
        {leaders.length > 0 ? (
          <div className="mt-3 flex items-center gap-2">
            <div className="flex -space-x-1.5">
              {leaders.slice(0, 3).map((m) => (
                <div
                  key={m.user.id}
                  className="h-6 w-6 rounded-full bg-secondary border-2 border-card flex items-center justify-center text-[10px] font-semibold overflow-hidden shrink-0"
                  title={m.user.name}
                >
                  {m.user.avatar
                    ? <img src={m.user.avatar} alt={m.user.name} className="w-full h-full object-cover" />
                    : initials(m.user.name)
                  }
                </div>
              ))}
            </div>
            <span className="text-xs text-muted-foreground">{leaders.map((m) => m.user.name).join(", ")}</span>
          </div>
        ) : (
          <p className="mt-3 text-xs text-muted-foreground italic">No leader assigned</p>
        )}
      </div>
      <div className="border-t px-3 py-2 flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
        <Link
          href={`/mychurch/groups/${group.id}`}
          className="flex-1 flex flex-col items-center gap-0.5 py-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-colors"
          title="Dashboard"
        >
          <LayoutDashboard className="h-4 w-4" />
          <span className="text-[9px] font-medium">Dashboard</span>
        </Link>
        {group.channels[0] && (
          <Link
            href={`/mychurch/chat/${group.channels[0].id}`}
            className="flex-1 flex flex-col items-center gap-0.5 py-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-colors"
            title={`#${group.channels[0].name}`}
          >
            <MessageSquare className="h-4 w-4" />
            <span className="text-[9px] font-medium">Chat</span>
          </Link>
        )}
        <Link
          href={`/mychurch/groups/${group.id}?tab=settings`}
          className="flex-1 flex flex-col items-center gap-0.5 py-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-colors"
          title="Settings"
        >
          <Settings className="h-4 w-4" />
          <span className="text-[9px] font-medium">Settings</span>
        </Link>
      </div>
    </div>
  )
}

export default function GroupsManager({ groups: init, categories: initCats, sessionRole }: Props) {
  const router = useRouter()
  const [groups, setGroups] = useState(init)
  const [categories, setCategories] = useState(initCats)
  const [showCreate, setShowCreate] = useState(false)
  const [showCats, setShowCats] = useState(false)

  // Create group form
  const [newName, setNewName] = useState("")
  const [newType, setNewType] = useState("")
  const [newCategoryId, setNewCategoryId] = useState("none")
  const [creating, setCreating] = useState(false)

  // Category management
  const [newCatName, setNewCatName] = useState("")
  const [editingCat, setEditingCat] = useState<Category | null>(null)
  const [editCatName, setEditCatName] = useState("")

  async function createGroup() {
    if (!newName.trim()) return
    setCreating(true)
    const res = await fetch("/api/groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newName,
        groupType: newType || null,
        categoryId: newCategoryId === "none" ? null : newCategoryId,
      }),
    })
    setCreating(false)
    if (res.ok) {
      const group = await res.json()
      setGroups((prev) => [...prev, group].sort((a, b) => a.name.localeCompare(b.name)))
      setNewName(""); setNewType(""); setNewCategoryId("none")
      setShowCreate(false)
      toast.success("Group created")
      router.push(`/mychurch/groups/${group.id}`)
    } else {
      toast.error("Failed to create group")
    }
  }

  async function addCategory() {
    if (!newCatName.trim()) return
    const res = await fetch("/api/group-categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newCatName }),
    })
    if (res.ok) {
      const cat = await res.json()
      setCategories((prev) => [...prev, cat].sort((a, b) => a.name.localeCompare(b.name)))
      setNewCatName("")
      toast.success("Group type added")
    }
  }

  async function saveEditCat() {
    if (!editingCat || !editCatName.trim()) return
    const res = await fetch(`/api/group-categories/${editingCat.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editCatName }),
    })
    if (res.ok) {
      const updated = await res.json()
      setCategories((prev) => prev.map((c) => (c.id === updated.id ? updated : c)))
      setEditingCat(null)
      toast.success("Group type updated")
    }
  }

  async function deleteCategory(id: string) {
    const res = await fetch(`/api/group-categories/${id}`, { method: "DELETE" })
    if (res.ok) {
      setCategories((prev) => prev.filter((c) => c.id !== id))
      setGroups((prev) => prev.map((g) => g.categoryId === id ? { ...g, categoryId: null, category: null } : g))
      toast.success("Group type deleted")
    }
  }

  // Group filter by category
  const [filterCat, setFilterCat] = useState("all")
  const [showArchived, setShowArchived] = useState(false)
  const activeGroups = groups.filter((g) => !g.archivedAt)
  const archivedGroups = groups.filter((g) => !!g.archivedAt)
  const visible = (filterCat === "all" ? activeGroups : activeGroups.filter((g) => g.categoryId === filterCat))

  async function unarchiveGroup(id: string) {
    const res = await fetch(`/api/groups/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archivedAt: null }),
    })
    if (res.ok) {
      setGroups((prev) => prev.map((g) => g.id === id ? { ...g, archivedAt: null } : g))
      toast.success("Group restored")
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Groups</h1>
        <div className="flex gap-2">
          {sessionRole === "ADMIN" && (
            <Button variant="outline" onClick={() => router.push("/mychurch/broadcasts")}>
              <Megaphone className="h-4 w-4 mr-1.5" /> Broadcasts
            </Button>
          )}
          <Button variant="outline" onClick={() => setShowCats(true)}>
            <Tags className="h-4 w-4 mr-1.5" /> Group Types
          </Button>
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4 mr-1" /> New Group
          </Button>
        </div>
      </div>

      {/* Group Type filter */}
      {categories.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilterCat("all")}
            className={`text-xs px-3 py-1 rounded-full border transition-colors ${filterCat === "all" ? "bg-primary text-primary-foreground border-primary" : "hover:bg-accent"}`}
          >
            All
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setFilterCat(c.id)}
              className={`text-xs px-3 py-1 rounded-full border transition-colors ${filterCat === c.id ? "bg-primary text-primary-foreground border-primary" : "hover:bg-accent"}`}
            >
              {c.name}
            </button>
          ))}
        </div>
      )}

      {/* Group grid */}
      {filterCat === "all" && categories.length > 0 ? (
        <div className="space-y-8">
          {[...categories, null].map((cat) => {
            const sectionGroups = activeGroups.filter((g) =>
              cat ? g.categoryId === cat.id : !g.categoryId
            )
            if (sectionGroups.length === 0) return null
            return (
              <div key={cat?.id ?? "uncategorized"} className="space-y-3">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  {cat ? cat.name : "Uncategorized"}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {sectionGroups.map((group) => <GroupCard key={group.id} group={group} onNavigate={() => router.push(`/mychurch/groups/${group.id}`)} />)}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {visible.map((group) => <GroupCard key={group.id} group={group} onNavigate={() => router.push(`/mychurch/groups/${group.id}`)} />)}
        {visible.length === 0 && (
          <p className="col-span-full text-center text-muted-foreground py-10">
            {activeGroups.length === 0 ? "No groups yet. Create one above." : "No groups with this type."}
          </p>
        )}
      </div>
      )}

      {/* Archived groups */}
      {archivedGroups.length > 0 && (
        <div className="space-y-3">
          <button
            onClick={() => setShowArchived((v) => !v)}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronDown className={`h-4 w-4 transition-transform ${showArchived ? "" : "-rotate-90"}`} />
            <Archive className="h-4 w-4" />
            Archived Groups ({archivedGroups.length})
          </button>
          {showArchived && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 opacity-60">
              {archivedGroups.map((group) => (
                <div key={group.id} className="rounded-xl border bg-card flex items-center justify-between p-4 gap-4">
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{group.name}</p>
                    {group.category && (
                      <p className="text-xs text-muted-foreground">{group.category.name}</p>
                    )}
                  </div>
                  <Button size="sm" variant="outline" onClick={() => unarchiveGroup(group.id)}>
                    <ArchiveRestore className="h-3.5 w-3.5 mr-1.5" />
                    Restore
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Create group dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>New Group</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label>Name *</Label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Young Adults"
                onKeyDown={(e) => e.key === "Enter" && createGroup()}
                autoFocus
              />
            </div>
            <div className="space-y-1">
              <Label>Description</Label>
              <Textarea value={newType} onChange={(e) => setNewType(e.target.value)} placeholder="What is this group about?" rows={3} />
            </div>
            <div className="space-y-1">
              <Label>Group Type</Label>
              <Select value={newCategoryId} onValueChange={setNewCategoryId}>
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={createGroup} disabled={creating || !newName.trim()}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Group Types manager dialog */}
      <Dialog open={showCats} onOpenChange={setShowCats}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Group Types</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="flex gap-2">
              <Input
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                placeholder="New type name…"
                onKeyDown={(e) => e.key === "Enter" && addCategory()}
              />
              <Button onClick={addCategory} size="sm"><Plus className="h-4 w-4" /></Button>
            </div>
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {categories.map((cat) => (
                <div key={cat.id} className="flex items-center gap-2 p-2 rounded-md border bg-card">
                  {editingCat?.id === cat.id ? (
                    <>
                      <Input
                        className="h-7 text-sm flex-1"
                        value={editCatName}
                        onChange={(e) => setEditCatName(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && saveEditCat()}
                        autoFocus
                      />
                      <Button size="sm" className="h-7 px-2" onClick={saveEditCat}>Save</Button>
                      <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setEditingCat(null)}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1 text-sm">{cat.name}</span>
                      <button
                        onClick={() => { setEditingCat(cat); setEditCatName(cat.name) }}
                        className="p-1 text-muted-foreground hover:text-foreground"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => deleteCategory(cat.id)}
                        className="p-1 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </>
                  )}
                </div>
              ))}
              {categories.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No categories yet.</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCats(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
