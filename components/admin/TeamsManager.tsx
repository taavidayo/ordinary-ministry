"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { Plus, Users, MessageSquare, FolderKanban, LayoutDashboard, Settings, Archive, ArchiveRestore, ChevronDown } from "lucide-react"

interface User { id: string; name: string; email: string; avatar: string | null }
interface Member { user: User; isLeader: boolean }
interface Channel { id: string; name: string }
interface Team {
  id: string
  name: string
  description: string | null
  archivedAt: string | null
  members: Member[]
  channels: Channel[]
}

interface Props {
  teams: Team[]
  allUsers: User[]
}

function initials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)
}


export default function TeamsManager({ teams: init }: Props) {
  const router = useRouter()
  const [teams, setTeams] = useState(init)
  const [newTeamName, setNewTeamName] = useState("")
  const [showArchived, setShowArchived] = useState(false)

  const activeTeams = teams.filter((t) => !t.archivedAt)
  const archivedTeams = teams.filter((t) => !!t.archivedAt)

  async function unarchiveTeam(id: string) {
    const res = await fetch(`/api/teams/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archivedAt: null }),
    })
    if (res.ok) {
      setTeams((prev) => prev.map((t) => t.id === id ? { ...t, archivedAt: null } : t))
      toast.success("Team restored")
    }
  }

  async function createTeam() {
    if (!newTeamName.trim()) return
    const res = await fetch("/api/teams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newTeamName }),
    })
    if (res.ok) {
      const team = await res.json()
      setTeams((prev) => [...prev, { ...team, members: [] }])
      setNewTeamName("")
      toast.success("Team created")
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Teams</h1>
        <div className="flex gap-2">
          <Input
            placeholder="New team name…"
            value={newTeamName}
            onChange={(e) => setNewTeamName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && createTeam()}
            className="w-48"
          />
          <Button onClick={createTeam}>
            <Plus className="h-4 w-4 mr-1" />
            Create
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {activeTeams.map((team) => {
          const leaders = team.members.filter((m) => m.isLeader)
          return (
            <div key={team.id} onClick={() => router.push(`/mychurch/teams/${team.id}`)} className="rounded-xl border bg-card shadow-sm hover:shadow-md transition-shadow flex flex-col cursor-pointer">
              {/* Card body */}
              <div className="p-5 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="font-semibold text-base leading-tight">{team.name}</h2>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                    <Users className="h-3.5 w-3.5" />
                    {team.members.length}
                  </div>
                </div>

                {team.description && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{team.description}</p>
                )}

                {leaders.length > 0 && (
                  <div className="mt-3 flex items-center gap-2">
                    <div className="flex -space-x-1.5">
                      {leaders.slice(0, 3).map((m) => (
                        <div key={m.user.id}
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
                    <span className="text-xs text-muted-foreground">
                      {leaders.map((m) => m.user.name).join(", ")}
                    </span>
                  </div>
                )}

                {leaders.length === 0 && (
                  <p className="mt-3 text-xs text-muted-foreground italic">No leader assigned</p>
                )}
              </div>

              {/* Quick-action buttons */}
              <div className="border-t px-3 py-2 flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
                {/* Dashboard */}
                <Link
                  href={`/mychurch/teams/${team.id}`}
                  className="flex-1 flex flex-col items-center gap-0.5 py-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-colors"
                  title="Dashboard"
                >
                  <LayoutDashboard className="h-4 w-4" />
                  <span className="text-[9px] font-medium">Dashboard</span>
                </Link>
                {/* Chat — only if a channel is linked */}
                {team.channels[0] && (
                  <Link
                    href={`/mychurch/chat/${team.channels[0].id}`}
                    className="flex-1 flex flex-col items-center gap-0.5 py-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-colors"
                    title={`#${team.channels[0].name}`}
                  >
                    <MessageSquare className="h-4 w-4" />
                    <span className="text-[9px] font-medium">Chat</span>
                  </Link>
                )}
                {/* Projects */}
                <Link
                  href={`/mychurch/teams/${team.id}?tab=tasks`}
                  className="flex-1 flex flex-col items-center gap-0.5 py-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-colors"
                  title="Projects"
                >
                  <FolderKanban className="h-4 w-4" />
                  <span className="text-[9px] font-medium">Projects</span>
                </Link>
                {/* Settings */}
                <Link
                  href={`/mychurch/teams/${team.id}/settings`}
                  className="flex-1 flex flex-col items-center gap-0.5 py-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-colors"
                  title="Settings"
                >
                  <Settings className="h-4 w-4" />
                  <span className="text-[9px] font-medium">Settings</span>
                </Link>
              </div>
            </div>
          )
        })}

        {activeTeams.length === 0 && (
          <p className="col-span-full text-center text-muted-foreground py-10">
            No teams yet. Create one above.
          </p>
        )}
      </div>

      {/* Archived teams */}
      {archivedTeams.length > 0 && (
        <div className="space-y-3">
          <button
            onClick={() => setShowArchived((v) => !v)}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronDown className={`h-4 w-4 transition-transform ${showArchived ? "" : "-rotate-90"}`} />
            <Archive className="h-4 w-4" />
            Archived Teams ({archivedTeams.length})
          </button>
          {showArchived && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 opacity-60">
              {archivedTeams.map((team) => (
                <div key={team.id} className="rounded-xl border bg-card flex items-center justify-between p-4 gap-4">
                  <p className="font-medium text-sm truncate">{team.name}</p>
                  <Button size="sm" variant="outline" onClick={() => unarchiveTeam(team.id)}>
                    <ArchiveRestore className="h-3.5 w-3.5 mr-1.5" />
                    Restore
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
