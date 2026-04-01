"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { Link2, Plus, Trash2, ExternalLink, X, Check } from "lucide-react"

interface Resource {
  id: string
  title: string
  url: string
  addedBy: { name: string }
  createdAt: string
}

interface Props {
  channelId: string
  canManage: boolean
}

export default function ChannelLinksCard({ channelId, canManage }: Props) {
  const [links, setLinks] = useState<Resource[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState("")
  const [url, setUrl] = useState("")

  useEffect(() => {
    fetch(`/api/channels/${channelId}/resources`)
      .then((r) => r.json())
      .then((data) => { setLinks(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [channelId])

  async function addLink() {
    if (!title.trim() || !url.trim()) { toast.error("Title and URL are required"); return }
    const normalizedUrl = url.startsWith("http") ? url : `https://${url}`
    setAdding(true)
    const res = await fetch(`/api/channels/${channelId}/resources`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: title.trim(), url: normalizedUrl }),
    })
    setAdding(false)
    if (res.ok) {
      const link = await res.json()
      setLinks((prev) => [link, ...prev])
      setTitle(""); setUrl(""); setShowForm(false)
      toast.success("Link pinned")
    } else {
      toast.error("Failed to pin link")
    }
  }

  async function deleteLink(id: string) {
    const channelMatch = links.find((l) => l.id === id)
    if (!channelMatch) return
    const res = await fetch(`/api/channels/${channelId}/resources/${id}`, { method: "DELETE" })
    if (res.ok || res.status === 204) {
      setLinks((prev) => prev.filter((l) => l.id !== id))
      toast.success("Link removed")
    } else {
      toast.error("Failed to remove link")
    }
  }

  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base flex items-center gap-2">
          <Link2 className="h-4 w-4" /> Pinned Links
        </CardTitle>
        {canManage && !showForm && (
          <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setShowForm(true)}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Pin Link
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-2">
        {/* Add form */}
        {showForm && (
          <div className="flex gap-2 items-start border rounded-md p-2 bg-muted/40">
            <div className="flex-1 space-y-1.5">
              <Input
                placeholder="Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="h-7 text-sm"
                autoFocus
              />
              <Input
                placeholder="URL"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="h-7 text-sm"
                onKeyDown={(e) => e.key === "Enter" && addLink()}
              />
            </div>
            <div className="flex gap-1 pt-0.5">
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={addLink} disabled={adding}>
                <Check className="h-3.5 w-3.5 text-green-600" />
              </Button>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setShowForm(false); setTitle(""); setUrl("") }}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}

        {/* Links list */}
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : links.length === 0 && !showForm ? (
          <p className="text-sm text-muted-foreground">No pinned links yet.</p>
        ) : (
          <div className="divide-y">
            {links.map((link) => (
              <div key={link.id} className="flex items-center gap-2 py-2 group">
                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium hover:underline flex-1 truncate"
                >
                  {link.title}
                </a>
                {canManage && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive shrink-0"
                    onClick={() => deleteLink(link.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
