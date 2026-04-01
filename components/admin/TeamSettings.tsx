"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { toast } from "sonner"
import { ArrowLeft, Hash, Link2, Link2Off, Trash2, Crown } from "lucide-react"
import { cn } from "@/lib/utils"

interface User { id: string; name: string; email: string; avatar: string | null }
interface Member { user: User; isLeader: boolean }
interface Channel { id: string; name: string; icon: string | null; type: string }
interface Team {
  id: string
  name: string
  description: string | null
  members: Member[]
  channels: Channel[]
}

interface Props {
  team: Team
  allChannels: Channel[]
  userRole: string
}

function initials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)
}

export default function TeamSettings({ team: init, allChannels: initUnlinked, userRole }: Props) {
  const router = useRouter()
  const isAdmin = userRole === "ADMIN"
  const isLeader = userRole === "ADMIN" || userRole === "LEADER"

  const [channels, setChannels] = useState(init.channels)
  const [unlinkedChannels, setUnlinkedChannels] = useState(initUnlinked)
  const [members, setMembers] = useState(init.members)
  const [channelToLink, setChannelToLink] = useState("")
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function unlinkChannel(channelId: string) {
    const res = await fetch(`/api/channels/${channelId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teamId: null }),
    })
    if (!res.ok) { toast.error("Failed to unlink channel"); return }
    const ch = channels.find(c => c.id === channelId)!
    setChannels(prev => prev.filter(c => c.id !== channelId))
    setUnlinkedChannels(prev => [...prev, ch].sort((a, b) => a.name.localeCompare(b.name)))
    toast.success(`#${ch.name} unlinked`)
  }

  async function linkChannel() {
    if (!channelToLink) return
    const res = await fetch(`/api/channels/${channelToLink}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teamId: init.id }),
    })
    if (!res.ok) { toast.error("Failed to link channel"); return }
    const ch = unlinkedChannels.find(c => c.id === channelToLink)!
    setUnlinkedChannels(prev => prev.filter(c => c.id !== channelToLink))
    setChannels(prev => [...prev, ch])
    setChannelToLink("")
    toast.success(`#${ch.name} linked`)
  }

  async function setLeader(userId: string, isLeader: boolean) {
    const member = members.find(m => m.user.id === userId)
    if (!member) return
    const res = await fetch(`/api/team-members/${init.id}/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isLeader }),
    })
    if (!res.ok) { toast.error("Failed to update leader"); return }
    setMembers(prev => prev.map(m => m.user.id === userId ? { ...m, isLeader } : m))
    toast.success(isLeader ? `${member.user.name} set as leader` : `${member.user.name} removed as leader`)
  }

  async function deleteTeam() {
    setDeleting(true)
    const res = await fetch(`/api/teams/${init.id}`, { method: "DELETE" })
    setDeleting(false)
    if (!res.ok) { toast.error("Failed to delete team"); return }
    toast.success(`"${init.name}" deleted`)
    router.push("/mychurch/teams")
  }

  return (
    <div className="max-w-2xl space-y-8">
      {/* Back nav */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/mychurch/teams/${init.id}`}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to {init.name}
          </Link>
        </Button>
      </div>

      <h1 className="text-2xl font-bold">{init.name} — Settings</h1>

      {/* ── Leader assignment ─────────────────────────────────── */}
      {isLeader && (
        <section className="space-y-3">
          <div>
            <h2 className="text-base font-semibold">Leaders</h2>
            <p className="text-sm text-muted-foreground mt-0.5">Assign or remove leader status for team members.</p>
          </div>
          <div className="rounded-lg border divide-y">
            {members.map(m => (
              <div key={m.user.id} className="flex items-center gap-3 px-4 py-3">
                <Avatar className="h-8 w-8 shrink-0">
                  {m.user.avatar && <AvatarImage src={m.user.avatar} alt={m.user.name} />}
                  <AvatarFallback className="text-xs">{initials(m.user.name)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{m.user.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{m.user.email}</p>
                </div>
                {m.isLeader && (
                  <span className="flex items-center gap-1 text-xs text-amber-600 font-medium shrink-0">
                    <Crown className="h-3 w-3" /> Leader
                  </span>
                )}
                <Button
                  size="sm" variant={m.isLeader ? "outline" : "secondary"}
                  className={cn("text-xs h-7 shrink-0", m.isLeader && "text-destructive border-destructive/40 hover:bg-destructive/10")}
                  onClick={() => setLeader(m.user.id, !m.isLeader)}
                >
                  {m.isLeader ? "Remove" : "Make Leader"}
                </Button>
              </div>
            ))}
            {members.length === 0 && (
              <p className="px-4 py-6 text-sm text-muted-foreground text-center">No members in this team.</p>
            )}
          </div>
        </section>
      )}

      {/* ── Connected chats ───────────────────────────────────── */}
      {isLeader && (
        <section className="space-y-3">
          <div>
            <h2 className="text-base font-semibold">Connected Chats</h2>
            <p className="text-sm text-muted-foreground mt-0.5">Link chat channels so this team can access them directly.</p>
          </div>

          <div className="rounded-lg border divide-y">
            {channels.map(ch => (
              <div key={ch.id} className="flex items-center gap-3 px-4 py-3">
                <Hash className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-sm flex-1 font-medium">{ch.name}</span>
                <Button
                  size="sm" variant="ghost"
                  className="text-xs h-7 text-muted-foreground hover:text-destructive shrink-0"
                  onClick={() => unlinkChannel(ch.id)}
                >
                  <Link2Off className="h-3.5 w-3.5 mr-1" /> Unlink
                </Button>
              </div>
            ))}
            {channels.length === 0 && (
              <p className="px-4 py-4 text-sm text-muted-foreground">No channels linked yet.</p>
            )}
          </div>

          {unlinkedChannels.length > 0 && (
            <div className="flex gap-2">
              <Select value={channelToLink} onValueChange={setChannelToLink}>
                <SelectTrigger className="flex-1 text-sm">
                  <SelectValue placeholder="Select a channel to link…" />
                </SelectTrigger>
                <SelectContent>
                  {unlinkedChannels.map(ch => (
                    <SelectItem key={ch.id} value={ch.id}>
                      <span className="flex items-center gap-1.5"><Hash className="h-3.5 w-3.5" />{ch.name}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button size="sm" onClick={linkChannel} disabled={!channelToLink}>
                <Link2 className="h-3.5 w-3.5 mr-1" /> Link
              </Button>
            </div>
          )}
        </section>
      )}

      {/* ── Danger zone ───────────────────────────────────────── */}
      {isAdmin && (
        <section className="space-y-3">
          <h2 className="text-base font-semibold text-destructive">Danger Zone</h2>
          <div className="rounded-lg border border-destructive/30 px-4 py-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">Delete this team</p>
              <p className="text-xs text-muted-foreground mt-0.5">Permanently removes the team, all tasks, projects, training, and checklists. This cannot be undone.</p>
            </div>
            <Button variant="destructive" size="sm" className="shrink-0" onClick={() => setConfirmDelete(true)}>
              <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete Team
            </Button>
          </div>
        </section>
      )}

      {/* Delete confirm dialog */}
      <Dialog open={confirmDelete} onOpenChange={o => !o && setConfirmDelete(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete "{init.name}"?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will permanently delete the team and all its data including tasks, projects, training modules, and checklists. This cannot be undone.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setConfirmDelete(false)}>Cancel</Button>
            <Button variant="destructive" size="sm" onClick={deleteTeam} disabled={deleting}>
              {deleting ? "Deleting…" : "Delete Team"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
