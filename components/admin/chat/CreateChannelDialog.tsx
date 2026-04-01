"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Hash } from "lucide-react"
import type { ChannelSummary } from "@/types/chat"
import { toast } from "sonner"

const QUICK_EMOJIS = [
  "💬","📣","🎵","🎮","📚","🏆","🙏","❤️","🔥","⚡",
  "🌟","🎉","📌","🤝","🧠","🎯","🛠️","📅","🌈","😊",
  "🍕","☕","🏀","⚽","🎸","🎤","📸","🌿","🚀","💡",
]

interface Props {
  open: boolean
  onOpenChange: (o: boolean) => void
  teams: { id: string; name: string }[]
  onCreated: (c: ChannelSummary) => void
}

export default function CreateChannelDialog({ open, onOpenChange, teams, onCreated }: Props) {
  const [name, setName] = useState("")
  const [icon, setIcon] = useState("")
  const [description, setDescription] = useState("")
  const [type, setType] = useState<"PUBLIC" | "PRIVATE" | "TEAM">("PUBLIC")
  const [teamId, setTeamId] = useState("")
  const [saving, setSaving] = useState(false)
  const [emojiOpen, setEmojiOpen] = useState(false)

  async function handleCreate() {
    if (!name.trim()) return
    setSaving(true)
    try {
      const res = await fetch("/api/channels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          icon: icon.trim() || null,
          description: description.trim() || null,
          type,
          teamId: type === "TEAM" ? teamId || null : null,
        }),
      })
      if (!res.ok) throw new Error()
      const channel = await res.json()
      onCreated({
        ...channel,
        createdAt: channel.createdAt,
        archivedAt: null,
        isMember: true,
        categoryId: null,
        order: 0,
      })
      setName("")
      setIcon("")
      setDescription("")
      setType("PUBLIC")
      setTeamId("")
      onOpenChange(false)
    } catch {
      toast.error("Failed to create channel")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Channel</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Icon + Name row */}
          <div className="space-y-1.5">
            <Label>Name</Label>
            <div className="flex gap-2">
              <Popover open={emojiOpen} onOpenChange={setEmojiOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-10 h-10 p-0 text-lg shrink-0"
                    title="Pick emoji icon"
                  >
                    {icon || <Hash className="h-4 w-4 text-muted-foreground" />}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-2" align="start">
                  <p className="text-xs text-muted-foreground mb-2">Pick an icon</p>
                  <div className="grid grid-cols-10 gap-0.5 mb-2">
                    {QUICK_EMOJIS.map((e) => (
                      <button
                        key={e}
                        className="h-7 w-7 flex items-center justify-center rounded hover:bg-accent text-base"
                        onClick={() => { setIcon(e); setEmojiOpen(false) }}
                      >
                        {e}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-1 items-center border-t pt-2">
                    <Input
                      placeholder="Or type emoji…"
                      value={icon}
                      onChange={(e) => setIcon(e.target.value)}
                      className="h-7 text-sm"
                      maxLength={2}
                    />
                    {icon && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs"
                        onClick={() => { setIcon(""); setEmojiOpen(false) }}
                      >
                        Clear
                      </Button>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
              <Input
                placeholder="general"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && name.trim()) handleCreate() }}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ch-desc">Description</Label>
            <Textarea
              id="ch-desc"
              placeholder="What's this channel about?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PUBLIC">Public — anyone can join</SelectItem>
                <SelectItem value="PRIVATE">Private — invite only</SelectItem>
                <SelectItem value="TEAM">Team — linked to a team</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {type === "TEAM" && teams.length > 0 && (
            <div className="space-y-1.5">
              <Label>Team</Label>
              <Select value={teamId} onValueChange={setTeamId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select team..." />
                </SelectTrigger>
                <SelectContent>
                  {teams.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={saving || !name.trim()}>
            {saving ? "Creating..." : "Create Channel"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
