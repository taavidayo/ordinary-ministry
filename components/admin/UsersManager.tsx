"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "sonner"
import { Plus, Trash2 } from "lucide-react"
import { ROLE_BADGE, CATEGORY_COLORS } from "@/lib/category-colors"
import UsersOverview, { LastServiceStats } from "@/components/admin/UsersOverview"
import PeopleSettingsSheet from "@/components/admin/PeopleSettingsSheet"

interface MemberCategory { id: string; name: string; color: string }
interface Ministry { id: string; name: string; color: string; description?: string | null }

interface User {
  id: string
  name: string
  email: string
  role: string
  phone: string | null
  createdAt: string | Date
  birthday: string | null
  gender: string | null
  memberCategory: MemberCategory | null
  ministry: Ministry | null
}

interface Props {
  users: User[]
  memberCategories: MemberCategory[]
  ministries: Ministry[]
  sessionRole: string
  lastServiceStats: LastServiceStats | null
}

function ColorBadge({ name, color }: { name: string; color: string }) {
  const c = CATEGORY_COLORS[color] ?? CATEGORY_COLORS.gray
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded font-medium ${c.bg} ${c.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {name}
    </span>
  )
}

export default function UsersManager({ users: init, memberCategories: initCats, ministries: initMins, sessionRole, lastServiceStats }: Props) {
  const router = useRouter()
  const isAdmin = sessionRole === "ADMIN"

  const [users, setUsers] = useState(init)
  const [memberCategories, setMemberCategories] = useState(initCats)
  const [ministries, setMinistries] = useState(initMins)

  const [filterCategory, setFilterCategory] = useState("all")
  const [filterMinistry, setFilterMinistry] = useState("all")

  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "MEMBER", phone: "" })
  const [saving, setSaving] = useState(false)

  const isVisitor = form.role === "VISITOR"

  const visible = users.filter((u) => {
    if (filterCategory !== "all") {
      if (filterCategory === "none" && u.memberCategory !== null) return false
      if (filterCategory !== "none" && u.memberCategory?.id !== filterCategory) return false
    }
    if (filterMinistry !== "all") {
      if (filterMinistry === "none" && u.ministry !== null) return false
      if (filterMinistry !== "none" && u.ministry?.id !== filterMinistry) return false
    }
    return true
  })

  async function createUser() {
    if (!form.name || !form.email) { toast.error("Name and email are required"); return }
    if (!isVisitor && !form.password) { toast.error("Password is required for non-visitor accounts"); return }
    setSaving(true)
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, password: form.password || undefined }),
    })
    setSaving(false)
    if (res.ok) {
      const user = await res.json()
      setUsers([...users, { ...user, memberCategory: null, ministry: null, birthday: null, gender: null }].sort((a, b) => a.name.localeCompare(b.name)))
      setForm({ name: "", email: "", password: "", role: "MEMBER", phone: "" })
      setOpen(false)
      toast.success("User created")
    } else {
      const err = await res.json()
      toast.error(err.error || "Failed to create user")
    }
  }

  async function deleteUser(id: string) {
    if (!confirm("Delete this user? This cannot be undone.")) return
    await fetch(`/api/users/${id}`, { method: "DELETE" })
    setUsers(users.filter((u) => u.id !== id))
    toast.success("User deleted")
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold">Church</h1>
        <div className="flex items-center gap-2 flex-wrap">
          {isAdmin && (
            <PeopleSettingsSheet
              memberCategories={memberCategories}
              ministries={ministries}
              onCategoriesChange={setMemberCategories}
              onMinistriesChange={setMinistries}
              onImported={() => router.refresh()}
            />
          )}
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-1" /> New Person</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>New Person</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-1">
                  <Label>Name *</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>Email *</Label>
                  <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>Role</Label>
                  <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="VISITOR">Visitor</SelectItem>
                      <SelectItem value="MEMBER">Member</SelectItem>
                      <SelectItem value="LEADER">Leader</SelectItem>
                      <SelectItem value="ADMIN">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Password {isVisitor ? "(optional for visitors)" : "*"}</Label>
                  <Input
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder={isVisitor ? "Leave blank — auto-generated" : ""}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Phone</Label>
                  <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </div>
                <Button onClick={createUser} disabled={saving} className="w-full">
                  {saving ? "Creating…" : "Create User"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Overview widgets */}
      <UsersOverview
        users={users}
        memberCategories={memberCategories}
        ministries={ministries}
        lastServiceStats={lastServiceStats}
      />

      {/* Filter chips — Member Category */}
      {memberCategories.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {[{ id: "all", name: "All Categories", color: "gray" }, { id: "none", name: "No Category", color: "gray" }, ...memberCategories].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setFilterCategory(cat.id)}
              className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${
                filterCategory === cat.id
                  ? "bg-foreground text-background"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {cat.id !== "all" && cat.id !== "none" && (
                <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1 ${CATEGORY_COLORS[cat.color]?.dot ?? "bg-gray-400"}`} />
              )}
              {cat.name}
            </button>
          ))}
        </div>
      )}

      {/* Filter chips — Ministry */}
      {ministries.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {[{ id: "all", name: "All Ministries", color: "gray" }, { id: "none", name: "No Ministry", color: "gray" }, ...ministries].map((min) => (
            <button
              key={min.id}
              onClick={() => setFilterMinistry(min.id)}
              className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${
                filterMinistry === min.id
                  ? "bg-foreground text-background"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {min.id !== "all" && min.id !== "none" && (
                <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1 ${CATEGORY_COLORS[min.color]?.dot ?? "bg-gray-400"}`} />
              )}
              {min.name}
            </button>
          ))}
        </div>
      )}

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((u) => (
                <TableRow
                  key={u.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => router.push(`/mychurch/users/${u.id}`)}
                >
                  <TableCell className="font-medium">{u.name}</TableCell>
                  <TableCell>
                    <div className="text-muted-foreground">{u.email}</div>
                    {(u.memberCategory || u.ministry) && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {u.memberCategory && <ColorBadge name={u.memberCategory.name} color={u.memberCategory.color} />}
                        {u.ministry && <ColorBadge name={u.ministry.name} color={u.ministry.color} />}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${ROLE_BADGE[u.role] ?? ROLE_BADGE.MEMBER}`}>
                      {u.role}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{u.phone ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteUser(u.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {visible.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    {users.length === 0 ? "No users yet." : "No users match the current filters."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
