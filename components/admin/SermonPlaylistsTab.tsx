"use client"

import { useState, useEffect } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Plus, RefreshCw, MoreHorizontal, Trash2, ExternalLink,
  ListVideo, Search, Pencil, RefreshCcw,
} from "lucide-react"

interface SermonPlaylist {
  id: string
  name: string
  youtubePlaylistId: string
  defaultSpeaker: string
  autoSync: boolean
  lastSyncedAt: string | null
  createdAt: string
  _count: { sermons: number }
}

interface Props {
  initialPlaylists: SermonPlaylist[]
  onSermonsChanged: () => void
}

function formatRelative(iso: string | null): string {
  if (!iso) return "Never"
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return "Just now"
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}d ago`
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

function extractPlaylistId(input: string): string {
  const trimmed = input.trim()
  try {
    const url = new URL(trimmed)
    const list = url.searchParams.get("list")
    if (list) return list
  } catch { /* not a URL */ }
  return trimmed
}

const EMPTY_FORM = { playlistInput: "", name: "", defaultSpeaker: "", autoSync: true, importExisting: true }

export default function SermonPlaylistsTab({ initialPlaylists, onSermonsChanged }: Props) {
  const [playlists, setPlaylists] = useState<SermonPlaylist[]>(initialPlaylists)
  const [syncing, setSyncing] = useState<Record<string, boolean>>({})

  // Auto-sync playlists that haven't been synced in >1 hour on mount
  useEffect(() => {
    const ONE_HOUR = 60 * 60 * 1000
    const stale = playlists.filter((p) => {
      if (!p.autoSync) return false
      if (!p.lastSyncedAt) return true
      return Date.now() - new Date(p.lastSyncedAt).getTime() > ONE_HOUR
    })
    stale.forEach((p) => syncPlaylist(p.id, false))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Add playlist dialog ──────────────────────────────────────────────────────
  const [addOpen, setAddOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [previewing, setPreviewing] = useState(false)
  const [preview, setPreview] = useState<{ thumbnail: string | null; videoCount: number } | null>(null)
  const [previewError, setPreviewError] = useState("")
  const [saving, setSaving] = useState(false)

  // ── Edit dialog ──────────────────────────────────────────────────────────────
  const [editTarget, setEditTarget] = useState<SermonPlaylist | null>(null)
  const [editName, setEditName] = useState("")
  const [editSpeaker, setEditSpeaker] = useState("")
  const [editAutoSync, setEditAutoSync] = useState(true)
  const [editSaving, setEditSaving] = useState(false)

  // ── Fetch YouTube preview ────────────────────────────────────────────────────
  async function fetchPreview() {
    const id = extractPlaylistId(form.playlistInput)
    if (!id) { setPreviewError("Enter a YouTube playlist URL or ID"); return }
    setPreviewing(true)
    setPreview(null)
    setPreviewError("")
    try {
      const res = await fetch(`/api/youtube-playlist-preview?playlistId=${encodeURIComponent(id)}`)
      const data = await res.json()
      if (!res.ok) { setPreviewError(data.error ?? "Failed to fetch playlist"); return }
      setPreview({ thumbnail: data.thumbnail, videoCount: data.videoCount })
      if (!form.name) setForm((f) => ({ ...f, name: data.title ?? "" }))
    } finally {
      setPreviewing(false)
    }
  }

  // ── Create playlist ──────────────────────────────────────────────────────────
  async function createPlaylist() {
    const youtubePlaylistId = extractPlaylistId(form.playlistInput)
    if (!form.name.trim() || !youtubePlaylistId) {
      toast.error("Name and playlist URL/ID are required"); return
    }
    setSaving(true)
    try {
      const res = await fetch("/api/sermon-playlists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          youtubePlaylistId,
          defaultSpeaker: form.defaultSpeaker.trim(),
          autoSync: form.autoSync,
        }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? "Failed to create playlist"); return }

      setPlaylists((prev) => [...prev, data])
      setAddOpen(false)
      setForm(EMPTY_FORM)
      setPreview(null)
      toast.success(`Playlist "${data.name}" created`)

      if (form.importExisting) {
        await syncPlaylist(data.id, false)
      }
    } finally {
      setSaving(false)
    }
  }

  // ── Sync playlist ────────────────────────────────────────────────────────────
  async function syncPlaylist(id: string, force = false) {
    setSyncing((prev) => ({ ...prev, [id]: true }))
    try {
      const res = await fetch(`/api/sermon-playlists/${id}/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? "Sync failed"); return }
      const { imported, updated, total, playlist } = data
      setPlaylists((prev) => prev.map((p) => (p.id === id ? { ...playlist } : p)))
      if (force) {
        toast.success(
          `Re-parsed ${updated} sermon${updated !== 1 ? "s" : ""}${imported > 0 ? `, imported ${imported} new` : ""} (${total} total)`
        )
      } else {
        toast.success(
          imported === 0
            ? "Already up to date"
            : `${imported} new sermon${imported !== 1 ? "s" : ""} imported (${total} total in playlist)`
        )
      }
      if (imported > 0 || updated > 0) onSermonsChanged()
    } finally {
      setSyncing((prev) => ({ ...prev, [id]: false }))
    }
  }

  // ── Edit playlist ────────────────────────────────────────────────────────────
  function openEdit(p: SermonPlaylist) {
    setEditTarget(p)
    setEditName(p.name)
    setEditSpeaker(p.defaultSpeaker)
    setEditAutoSync(p.autoSync)
  }

  async function saveEdit() {
    if (!editTarget) return
    setEditSaving(true)
    try {
      const res = await fetch(`/api/sermon-playlists/${editTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName.trim(), defaultSpeaker: editSpeaker.trim(), autoSync: editAutoSync }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? "Failed to save"); return }
      setPlaylists((prev) => prev.map((p) => (p.id === editTarget.id ? { ...p, ...data } : p)))
      setEditTarget(null)
      toast.success("Playlist updated")
    } finally {
      setEditSaving(false)
    }
  }

  // ── Delete playlist ──────────────────────────────────────────────────────────
  async function deletePlaylist(id: string, name: string) {
    if (!confirm(`Delete "${name}"? Imported sermons will remain but lose their playlist link.`)) return
    const res = await fetch(`/api/sermon-playlists/${id}`, { method: "DELETE" })
    if (res.ok) {
      setPlaylists((prev) => prev.filter((p) => p.id !== id))
      toast.success("Playlist deleted")
    } else {
      toast.error("Failed to delete")
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          YouTube playlists automatically import new videos as sermons.
        </p>
        <Button size="sm" onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> Add Playlist
        </Button>
      </div>

      {playlists.length === 0 ? (
        <div className="border rounded-lg py-16 text-center text-muted-foreground">
          <ListVideo className="h-8 w-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No playlists yet.</p>
          <p className="text-xs mt-1">Add a YouTube playlist to start importing sermons automatically.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {playlists.map((p) => (
            <div key={p.id} className="border rounded-lg overflow-hidden bg-white">
              <div className="aspect-video bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center relative">
                <ListVideo className="h-10 w-10 text-red-300" />
                <a
                  href={`https://www.youtube.com/playlist?list=${p.youtubePlaylistId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute top-2 right-2 h-6 w-6 rounded bg-black/40 flex items-center justify-center text-white hover:bg-black/60 transition-colors"
                  title="Open in YouTube"
                >
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>

              <div className="p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{p.name}</p>
                    {p.defaultSpeaker && (
                      <p className="text-xs text-muted-foreground truncate">{p.defaultSpeaker}</p>
                    )}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onSelect={() => openEdit(p)}>
                        <Pencil className="h-3.5 w-3.5 mr-2" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => syncPlaylist(p.id, true)} disabled={!!syncing[p.id]}>
                        <RefreshCcw className="h-3.5 w-3.5 mr-2" /> Re-parse existing
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <a
                          href={`https://www.youtube.com/playlist?list=${p.youtubePlaylistId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="h-3.5 w-3.5 mr-2" /> Open in YouTube
                        </a>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onSelect={() => deletePlaylist(p.id, p.name)}
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{p._count.sermons} sermon{p._count.sermons !== 1 ? "s" : ""}</span>
                  <span>Synced: {formatRelative(p.lastSyncedAt)}</span>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 h-7 text-xs"
                    onClick={() => syncPlaylist(p.id, false)}
                    disabled={!!syncing[p.id]}
                  >
                    <RefreshCw className={`h-3 w-3 mr-1 ${syncing[p.id] ? "animate-spin" : ""}`} />
                    {syncing[p.id] ? "Syncing…" : "Sync Now"}
                  </Button>
                  <div className="flex items-center gap-1.5 shrink-0" title="Auto-sync on page load">
                    <span className="text-xs text-muted-foreground">Auto</span>
                    <input
                      type="checkbox"
                      checked={p.autoSync}
                      className="h-3.5 w-3.5 cursor-pointer accent-primary"
                      onChange={async (e) => {
                        const checked = e.target.checked
                        const res = await fetch(`/api/sermon-playlists/${p.id}`, {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ autoSync: checked }),
                        })
                        if (res.ok) {
                          setPlaylists((prev) => prev.map((pl) => pl.id === p.id ? { ...pl, autoSync: checked } : pl))
                        }
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Add Playlist dialog ──────────────────────────────────────────────── */}
      <Dialog open={addOpen} onOpenChange={(o) => { if (!o) { setAddOpen(false); setPreview(null); setPreviewError(""); setForm(EMPTY_FORM) } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add YouTube Playlist</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <Label>YouTube Playlist URL or ID *</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="https://youtube.com/playlist?list=PL… or PLxxxxxx"
                  value={form.playlistInput}
                  onChange={(e) => { setForm((f) => ({ ...f, playlistInput: e.target.value })); setPreview(null); setPreviewError("") }}
                  onKeyDown={(e) => { if (e.key === "Enter") fetchPreview() }}
                />
                <Button variant="outline" size="sm" onClick={fetchPreview} disabled={previewing || !form.playlistInput.trim()}>
                  <Search className={`h-4 w-4 ${previewing ? "animate-pulse" : ""}`} />
                </Button>
              </div>
              {previewError && <p className="text-xs text-destructive">{previewError}</p>}
            </div>

            {preview && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border">
                {preview.thumbnail ? (
                  <img src={preview.thumbnail} className="w-20 h-12 rounded object-cover shrink-0" alt="" />
                ) : (
                  <div className="w-20 h-12 rounded bg-red-100 flex items-center justify-center shrink-0">
                    <ListVideo className="h-5 w-5 text-red-400" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{form.name}</p>
                  <p className="text-xs text-muted-foreground">{preview.videoCount} videos</p>
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label>Playlist Name *</Label>
              <Input
                placeholder="Sunday Sermons 2025"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Default Speaker</Label>
              <Input
                placeholder="Pastor John Smith"
                value={form.defaultSpeaker}
                onChange={(e) => setForm((f) => ({ ...f, defaultSpeaker: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">Used when the video title does not include a speaker name.</p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Import existing videos</p>
                  <p className="text-xs text-muted-foreground">Sync all videos in the playlist now</p>
                </div>
                <input
                  type="checkbox"
                  checked={form.importExisting}
                  className="h-4 w-4 cursor-pointer accent-primary"
                  onChange={(e) => setForm((f) => ({ ...f, importExisting: e.target.checked }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Auto-sync</p>
                  <p className="text-xs text-muted-foreground">Sync new videos automatically on page load</p>
                </div>
                <input
                  type="checkbox"
                  checked={form.autoSync}
                  className="h-4 w-4 cursor-pointer accent-primary"
                  onChange={(e) => setForm((f) => ({ ...f, autoSync: e.target.checked }))}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" size="sm" onClick={() => { setAddOpen(false); setForm(EMPTY_FORM); setPreview(null) }}>
                Cancel
              </Button>
              <Button size="sm" onClick={createPlaylist} disabled={saving || !form.name.trim() || !form.playlistInput.trim()}>
                {saving ? "Creating…" : "Create Playlist"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Edit dialog ─────────────────────────────────────────────────────── */}
      <Dialog open={!!editTarget} onOpenChange={(o) => { if (!o) setEditTarget(null) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit Playlist</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-1">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Default Speaker</Label>
              <Input value={editSpeaker} onChange={(e) => setEditSpeaker(e.target.value)} />
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Auto-sync</p>
              <input
                type="checkbox"
                checked={editAutoSync}
                className="h-4 w-4 cursor-pointer accent-primary"
                onChange={(e) => setEditAutoSync(e.target.checked)}
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" size="sm" onClick={() => setEditTarget(null)}>Cancel</Button>
              <Button size="sm" onClick={saveEdit} disabled={editSaving || !editName.trim()}>
                {editSaving ? "Saving…" : "Save"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
