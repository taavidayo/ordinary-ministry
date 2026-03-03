"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { Plus, Trash2, UserPlus, X } from "lucide-react"

interface User { id: string; name: string; email: string }
interface Role { id: string; name: string; teamId: string; needed: number }
interface Member { user: User }
interface Team { id: string; name: string; description: string | null; roles: Role[]; members: Member[] }

interface Props {
  teams: Team[]
  allUsers: User[]
}

export default function TeamsManager({ teams: init, allUsers }: Props) {
  const [teams, setTeams] = useState(init)
  const [newTeamName, setNewTeamName] = useState("")
  const [newRoles, setNewRoles] = useState<Record<string, string>>({})

  async function createTeam() {
    if (!newTeamName) return
    const res = await fetch("/api/teams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newTeamName }),
    })
    if (res.ok) {
      const team = await res.json()
      setTeams([...teams, { ...team, roles: [], members: [] }])
      setNewTeamName("")
      toast.success("Team created")
    }
  }

  async function deleteTeam(id: string) {
    if (!confirm("Delete team?")) return
    await fetch(`/api/teams/${id}`, { method: "DELETE" })
    setTeams(teams.filter((t) => t.id !== id))
    toast.success("Team deleted")
  }

  async function addRole(teamId: string) {
    const name = newRoles[teamId]?.trim()
    if (!name) return
    const res = await fetch("/api/roles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teamId, name }),
    })
    if (res.ok) {
      const role = await res.json()
      setTeams(teams.map((t) => t.id === teamId ? { ...t, roles: [...t.roles, role] } : t))
      setNewRoles({ ...newRoles, [teamId]: "" })
      toast.success("Role added")
    }
  }

  async function deleteRole(roleId: string, teamId: string) {
    if (!confirm("Delete this role? All scheduling slots for this role across all services will also be deleted.")) return
    const res = await fetch(`/api/roles/${roleId}`, { method: "DELETE" })
    if (res.ok) {
      setTeams(teams.map((t) => t.id === teamId ? { ...t, roles: t.roles.filter((r) => r.id !== roleId) } : t))
      toast.success("Role deleted")
    } else {
      toast.error("Failed to delete role")
    }
  }


  async function addMember(teamId: string, userId: string) {
    const res = await fetch("/api/team-members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teamId, userId }),
    })
    if (res.ok) {
      const user = allUsers.find((u) => u.id === userId)!
      setTeams(teams.map((t) => t.id === teamId ? { ...t, members: [...t.members, { user }] } : t))
      toast.success("Member added")
    } else {
      toast.error("Already a member")
    }
  }

  async function removeMember(teamId: string, userId: string) {
    await fetch(`/api/team-members/${teamId}/${userId}`, { method: "DELETE" })
    setTeams(teams.map((t) => t.id === teamId
      ? { ...t, members: t.members.filter((m) => m.user.id !== userId) }
      : t
    ))
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
          <Button onClick={createTeam}><Plus className="h-4 w-4 mr-1" />Create</Button>
        </div>
      </div>

      <div className="grid gap-4">
        {teams.map((team) => (
          <Card key={team.id}>
            <CardHeader className="flex flex-row items-center justify-between py-3">
              <CardTitle className="text-base">{team.name}</CardTitle>
              <Button variant="destructive" size="sm" onClick={() => deleteTeam(team.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-4">
              {/* Roles */}
              <div>
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">Roles</Label>
                <div className="flex flex-wrap gap-1.5 mt-1 mb-2">
                  {team.roles.map((r) => (
                    <span key={r.id} className="inline-flex items-center gap-1 bg-secondary text-secondary-foreground rounded-full pl-2.5 pr-1 py-0.5 text-xs font-medium">
                      {r.name}
                      <button
                        type="button"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => deleteRole(r.id, team.id)}
                        title="Delete role"
                      >
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </span>
                  ))}
                  {team.roles.length === 0 && <span className="text-xs text-muted-foreground">None</span>}
                </div>
                <div className="flex gap-1">
                  <Input
                    placeholder="Role name…"
                    className="h-7 text-sm"
                    value={newRoles[team.id] ?? ""}
                    onChange={(e) => setNewRoles({ ...newRoles, [team.id]: e.target.value })}
                    onKeyDown={(e) => e.key === "Enter" && addRole(team.id)}
                  />
                  <Button size="sm" className="h-7" onClick={() => addRole(team.id)}>Add</Button>
                </div>
              </div>

              {/* Members */}
              <div>
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">Members</Label>
                <div className="space-y-1 mt-1 mb-2">
                  {team.members.map((m) => (
                    <div key={m.user.id} className="flex items-center justify-between">
                      <span className="text-sm">{m.user.name}</span>
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => removeMember(team.id, m.user.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                  {team.members.length === 0 && <span className="text-xs text-muted-foreground">No members</span>}
                </div>
                <Select onValueChange={(uid) => addMember(team.id, uid)}>
                  <SelectTrigger className="h-7 text-sm">
                    <SelectValue placeholder="Add member…" />
                  </SelectTrigger>
                  <SelectContent>
                    {allUsers
                      .filter((u) => !team.members.some((m) => m.user.id === u.id))
                      .map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          <UserPlus className="h-3 w-3 inline mr-1" />{u.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        ))}
        {teams.length === 0 && (
          <p className="text-center text-muted-foreground py-10">No teams yet. Create one above.</p>
        )}
      </div>
    </div>
  )
}
