"use client"

import { useState, useEffect } from "react"
import { X, Plus, Trash2, Hash } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import type { ChannelDetail } from "@/types/chat"
import { toast } from "sonner"

const QUICK_EMOJIS = [
  "💬","📣","🎵","🎮","📚","🏆","🙏","❤️","🔥","⚡",
  "🌟","🎉","📌","🤝","🧠","🎯","🛠️","📅","🌈","😊",
  "🍕","☕","🏀","⚽","🎸","🎤","📸","🌿","🚀","💡",
]

interface Permission {
  id: string
  userId: string
  canEdit: boolean
  canDelete: boolean
  canManage: boolean
  user: { id: string; name: string; avatar: string | null }
}

interface Props {
  channel: ChannelDetail
  currentUser: { id: string; role: string }
  onClose: () => void
  onUpdated: (patch: { name?: string; description?: string | null; icon?: string | null }) => void
  onArchived?: () => void
  onUnarchived?: () => void
  onDeleted?: () => void
}

export default function ChannelSettingsPanel({ channel, currentUser, onClose, onUpdated, onArchived, onUnarchived, onDeleted }: Props) {
  const [name, setName] = useState(channel.name)
  const [description, setDescription] = useState(channel.description ?? "")
  const [icon, setIcon] = useState(channel.icon ?? "")
  const [saving, setSaving] = useState(false)
  const [emojiOpen, setEmojiOpen] = useState(false)
  const [archiving, setArchiving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const [permissions, setPermissions] = useState<Permission[]>([])
  const [loadingPerms, setLoadingPerms] = useState(true)
  const [userSearch, setUserSearch] = useState("")
  const [searchResults, setSearchResults] = useState<{ id: string; name: string }[]>([])
  const [searching, setSearching] = useState(false)

  const isOwner = channel.createdById === currentUser.id
  const isAdmin = currentUser.role === "ADMIN"
  const canManage = isOwner || isAdmin

  useEffect(() => {
    fetch(`/api/channels/${channel.id}/permissions`)
      .then((r) => r.json())
      .then(setPermissions)
      .catch(() => {})
      .finally(() => setLoadingPerms(false))
  }, [channel.id])

  async function handleSave() {
    if (!name.trim()) return
    setSaving(true)
    try {
      const res = await fetch(`/api/channels/${channel.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          icon: icon.trim() || null,
        }),
      })
      if (!res.ok) throw new Error()
      onUpdated({
        name: name.trim(),
        description: description.trim() || null,
        icon: icon.trim() || null,
      })
      toast.success("Channel updated")
    } catch {
      toast.error("Failed to save changes")
    } finally {
      setSaving(false)
    }
  }

  async function handleArchive() {
    setArchiving(true)
    try {
      const res = await fetch(`/api/channels/${channel.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archived: true }),
      })
      if (!res.ok) throw new Error()
      toast.success("Channel archived")
      onArchived?.()
    } catch {
      toast.error("Failed to archive channel")
    } finally {
      setArchiving(false)
    }
  }

  async function handleUnarchive() {
    setArchiving(true)
    try {
      const res = await fetch(`/api/channels/${channel.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archived: false }),
      })
      if (!res.ok) throw new Error()
      toast.success("Channel unarchived")
      onUnarchived?.()
    } catch {
      toast.error("Failed to unarchive channel")
    } finally {
      setArchiving(false)
    }
  }

  async function handleDelete() {
    if (!confirm(`Permanently delete "#${channel.name}"? This cannot be undone.`)) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/channels/${channel.id}`, { method: "DELETE" })
      if (!res.ok) throw new Error()
      toast.success("Channel deleted")
      onDeleted?.()
    } catch {
      toast.error("Failed to delete channel")
    } finally {
      setDeleting(false)
    }
  }

  async function searchUsers(q: string) {
    if (!q.trim()) { setSearchResults([]); return }
    setSearching(true)
    try {
      const res = await fetch(`/api/users?search=${encodeURIComponent(q)}&limit=8`)
      if (!res.ok) return
      const users = await res.json()
      // Filter out already-permissioned users and channel creator
      const existingIds = new Set([
        ...permissions.map((p) => p.userId),
        channel.createdById,
      ])
      setSearchResults((users as { id: string; name: string }[]).filter((u) => !existingIds.has(u.id)))
    } catch {
      setSearchResults([])
    } finally {
      setSearching(false)
    }
  }

  async function handleAddPermission(userId: string, userName: string) {
    const res = await fetch(`/api/channels/${channel.id}/permissions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, canEdit: false, canDelete: false, canManage: false }),
    })
    if (!res.ok) { toast.error("Failed to add user"); return }
    const perm = await res.json()
    setPermissions((prev) => [...prev, perm])
    setUserSearch("")
    setSearchResults([])
  }

  async function handleUpdatePermission(userId: string, field: "canEdit" | "canDelete" | "canManage", value: boolean) {
    const perm = permissions.find((p) => p.userId === userId)
    if (!perm) return
    const updated = { canEdit: perm.canEdit, canDelete: perm.canDelete, canManage: perm.canManage, [field]: value }
    const res = await fetch(`/api/channels/${channel.id}/permissions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, ...updated }),
    })
    if (!res.ok) return
    setPermissions((prev) => prev.map((p) => p.userId === userId ? { ...p, ...updated } : p))
  }

  async function handleRemovePermission(userId: string) {
    const res = await fetch(`/api/channels/${channel.id}/permissions/${userId}`, { method: "DELETE" })
    if (!res.ok) return
    setPermissions((prev) => prev.filter((p) => p.userId !== userId))
  }

  return (
    <div className="w-80 border-l bg-card flex flex-col">
      <div className="p-3 border-b flex items-center justify-between shrink-0">
        <p className="font-semibold text-sm">Channel Settings</p>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Basic Info */}
        <div className="space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">General</p>

          <div className="space-y-1.5">
            <Label className="text-xs">Icon &amp; Name</Label>
            <div className="flex gap-2">
              <Popover open={emojiOpen} onOpenChange={setEmojiOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-10 h-10 p-0 text-lg shrink-0" title="Change icon">
                    {icon || <Hash className="h-4 w-4 text-muted-foreground" />}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-2" align="start">
                  <p className="text-xs text-muted-foreground mb-2">Pick an icon</p>
                  <div className="grid grid-cols-10 gap-0.5 mb-2">
                    {QUICK_EMOJIS.map((e) => (
                      <button key={e}
                        className="h-7 w-7 flex items-center justify-center rounded hover:bg-accent text-base"
                        onClick={() => { setIcon(e); setEmojiOpen(false) }}
                      >{e}</button>
                    ))}
                  </div>
                  <div className="flex gap-1 items-center border-t pt-2">
                    <Input placeholder="Or type emoji…" value={icon}
                      onChange={(e) => setIcon(e.target.value)}
                      className="h-7 text-sm" maxLength={2} />
                    {icon && (
                      <Button size="sm" variant="ghost" className="h-7 text-xs"
                        onClick={() => { setIcon(""); setEmojiOpen(false) }}>Clear</Button>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
              <Input value={name} onChange={(e) => setName(e.target.value)} className="flex-1" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="What's this channel about?"
              className="text-sm"
            />
          </div>

          <Button size="sm" onClick={handleSave} disabled={saving || !name.trim()}>
            {saving ? "Saving…" : "Save Changes"}
          </Button>
        </div>

        {/* Danger zone */}
        {canManage && (
          <div className="space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Danger Zone</p>
            <div className="border border-destructive/30 rounded-lg p-3 space-y-3">
              {channel.archivedAt ? (
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">Unarchive channel</p>
                    <p className="text-xs text-muted-foreground">Restore this channel to the active list.</p>
                  </div>
                  <Button size="sm" variant="outline" disabled={archiving} onClick={handleUnarchive}>
                    {archiving ? "…" : "Unarchive"}
                  </Button>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">Archive channel</p>
                    <p className="text-xs text-muted-foreground">Hide this channel. Messages are preserved and it can be unarchived later.</p>
                  </div>
                  <Button size="sm" variant="outline" disabled={archiving} onClick={handleArchive}>
                    {archiving ? "…" : "Archive"}
                  </Button>
                </div>
              )}
              <div className="border-t border-destructive/20" />
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-destructive">Delete channel</p>
                  <p className="text-xs text-muted-foreground">Permanently delete this channel and all its messages.</p>
                </div>
                <Button size="sm" variant="destructive" disabled={deleting} onClick={handleDelete}>
                  {deleting ? "…" : "Delete"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Permissions */}
        {canManage && (
          <div className="space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Permissions</p>
            <p className="text-xs text-muted-foreground">
              Grant specific users elevated permissions in this channel.
            </p>

            {/* User search */}
            <div className="relative">
              <Input
                placeholder="Search users to add…"
                value={userSearch}
                onChange={(e) => { setUserSearch(e.target.value); searchUsers(e.target.value) }}
                className="h-8 text-sm"
              />
              {searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 bg-card border rounded-md shadow-lg z-20 mt-1 max-h-40 overflow-y-auto">
                  {searchResults.map((u) => (
                    <button
                      key={u.id}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-accent/50 flex items-center gap-2"
                      onClick={() => handleAddPermission(u.id, u.name)}
                    >
                      <div className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium shrink-0">
                        {u.name[0].toUpperCase()}
                      </div>
                      {u.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Permission rows */}
            {loadingPerms && <p className="text-xs text-muted-foreground">Loading…</p>}
            {permissions.length === 0 && !loadingPerms && (
              <p className="text-xs text-muted-foreground">No custom permissions set.</p>
            )}
            <div className="space-y-2">
              {permissions.map((p) => (
                <div key={p.userId} className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium">
                        {p.user.name[0].toUpperCase()}
                      </div>
                      <span className="text-sm font-medium">{p.user.name}</span>
                    </div>
                    <Button
                      variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive"
                      onClick={() => handleRemovePermission(p.userId)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <div className="space-y-1.5">
                    {(
                      [
                        { key: "canEdit", label: "Edit channel settings" },
                        { key: "canDelete", label: "Delete any message" },
                        { key: "canManage", label: "Manage members & permissions" },
                      ] as const
                    ).map(({ key, label }) => (
                      <div key={key} className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">{label}</span>
                        <input
                          type="checkbox"
                          checked={p[key]}
                          onChange={(e) => handleUpdatePermission(p.userId, key, e.target.checked)}
                          className="h-3.5 w-3.5 rounded border-gray-300 text-primary cursor-pointer"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
