"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import ChordProRenderer from "@/components/songbook/ChordProRenderer"
import { toast } from "sonner"
import { Trash2, Plus, Eye, EyeOff } from "lucide-react"

interface Arrangement {
  id: string
  name: string
  chordproText: string
  createdAt: Date
}

interface Song {
  id: string
  title: string
  author: string | null
  genre: string | null
  tags: string[]
  arrangements: Arrangement[]
}

export default function SongEditor({ song: initialSong }: { song: Song }) {
  const router = useRouter()
  const [song, setSong] = useState(initialSong)
  const [saving, setSaving] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const [newArr, setNewArr] = useState({ name: "", chordproText: "" })
  const [addingArr, setAddingArr] = useState(false)

  async function saveSong() {
    setSaving(true)
    const res = await fetch(`/api/songs/${song.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: song.title,
        author: song.author,
        genre: song.genre,
        tags: song.tags,
      }),
    })
    setSaving(false)
    if (res.ok) toast.success("Song saved")
    else toast.error("Failed to save")
  }

  async function deleteSong() {
    if (!confirm("Delete this song?")) return
    await fetch(`/api/songs/${song.id}`, { method: "DELETE" })
    router.push("/admin/songs")
  }

  async function addArrangement() {
    if (!newArr.name || !newArr.chordproText) {
      toast.error("Name and ChordPro content required")
      return
    }
    const res = await fetch("/api/arrangements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ songId: song.id, ...newArr }),
    })
    if (res.ok) {
      const arr = await res.json()
      setSong((s) => ({ ...s, arrangements: [...s.arrangements, arr] }))
      setNewArr({ name: "", chordproText: "" })
      setAddingArr(false)
      toast.success("Arrangement added")
    } else {
      toast.error("Failed to add arrangement")
    }
  }

  async function deleteArrangement(id: string) {
    if (!confirm("Delete arrangement?")) return
    await fetch(`/api/arrangements/${id}`, { method: "DELETE" })
    setSong((s) => ({ ...s, arrangements: s.arrangements.filter((a) => a.id !== id) }))
    toast.success("Arrangement deleted")
  }

  async function saveArrangement(arr: Arrangement) {
    const res = await fetch(`/api/arrangements/${arr.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: arr.name, chordproText: arr.chordproText }),
    })
    if (res.ok) toast.success("Saved")
    else toast.error("Failed to save")
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{song.title}</h1>
        <div className="flex gap-2">
          <Button variant="destructive" size="sm" onClick={deleteSong}>
            <Trash2 className="h-4 w-4 mr-1" /> Delete
          </Button>
          <Button size="sm" onClick={saveSong} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Details</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label>Title</Label>
            <Input value={song.title} onChange={(e) => setSong({ ...song, title: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label>Author</Label>
            <Input value={song.author ?? ""} onChange={(e) => setSong({ ...song, author: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label>Genre</Label>
            <Input value={song.genre ?? ""} onChange={(e) => setSong({ ...song, genre: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label>Tags (comma-separated)</Label>
            <Input
              value={song.tags.join(", ")}
              onChange={(e) =>
                setSong({ ...song, tags: e.target.value.split(",").map((t) => t.trim()).filter(Boolean) })
              }
            />
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Arrangements</h2>
          <Button size="sm" variant="outline" onClick={() => setAddingArr(true)}>
            <Plus className="h-4 w-4 mr-1" /> Add Arrangement
          </Button>
        </div>

        {addingArr && (
          <Card className="border-blue-200">
            <CardHeader><CardTitle className="text-sm">New Arrangement</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <Label>Name</Label>
                <Input
                  placeholder="e.g. Full Band, Acoustic"
                  value={newArr.name}
                  onChange={(e) => setNewArr({ ...newArr, name: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>ChordPro Content</Label>
                <Textarea
                  rows={10}
                  className="font-mono text-sm"
                  placeholder="{title: Amazing Grace}&#10;{key: G}&#10;&#10;[G]Amazing [G7]grace how [C]sweet the [G]sound"
                  value={newArr.chordproText}
                  onChange={(e) => setNewArr({ ...newArr, chordproText: e.target.value })}
                />
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={addArrangement}>Save Arrangement</Button>
                <Button size="sm" variant="outline" onClick={() => setAddingArr(false)}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {song.arrangements.map((arr) => (
          <Card key={arr.id}>
            <CardHeader className="flex flex-row items-center justify-between py-3">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{arr.name}</Badge>
              </div>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setPreview(preview === arr.id ? null : arr.id)}
                >
                  {preview === arr.id ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive"
                  onClick={() => deleteArrangement(arr.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <Label>Name</Label>
                <Input
                  value={arr.name}
                  onChange={(e) => {
                    const updated = { ...arr, name: e.target.value }
                    setSong((s) => ({ ...s, arrangements: s.arrangements.map((a) => (a.id === arr.id ? updated : a)) }))
                  }}
                />
              </div>
              <div className="space-y-1">
                <Label>ChordPro</Label>
                <Textarea
                  rows={8}
                  className="font-mono text-sm"
                  value={arr.chordproText}
                  onChange={(e) => {
                    const updated = { ...arr, chordproText: e.target.value }
                    setSong((s) => ({ ...s, arrangements: s.arrangements.map((a) => (a.id === arr.id ? updated : a)) }))
                  }}
                />
              </div>
              {preview === arr.id && (
                <div className="border rounded p-3 bg-gray-50">
                  <ChordProRenderer chordproText={arr.chordproText} />
                </div>
              )}
              <Button size="sm" onClick={() => saveArrangement(arr)}>Save</Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
