"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart2, Users, CalendarDays, UserPlus } from "lucide-react"
import { CATEGORY_COLORS } from "@/lib/category-colors"

interface OverviewUser {
  id: string
  birthday: string | Date | null
  gender: string | null
  ministry: { id: string; name: string; color: string } | null
  memberCategory: { id: string; name: string; color: string } | null
  createdAt: string | Date
}

export interface LastServiceStats {
  title: string
  date: string
  headcount: number
}

interface Props {
  users: OverviewUser[]
  memberCategories: { id: string; name: string; color: string }[]
  ministries: { id: string; name: string; color: string }[]
  lastServiceStats: LastServiceStats | null
}

type DemoView = "age" | "gender" | "ministry"

const COLOR_BAR: Record<string, string> = {
  gray:   "bg-gray-400",
  red:    "bg-red-400",
  orange: "bg-orange-400",
  yellow: "bg-yellow-400",
  green:  "bg-green-400",
  blue:   "bg-blue-400",
  purple: "bg-purple-400",
  pink:   "bg-pink-400",
}

function computeAge(birthday: string | Date | null): number | null {
  if (!birthday) return null
  const b = new Date(birthday)
  const now = new Date()
  let age = now.getFullYear() - b.getFullYear()
  const m = now.getMonth() - b.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--
  return age
}

function HBar({ label, count, max, color = "bg-primary" }: { label: string; count: number; max: number; color?: string }) {
  const pct = max === 0 || count === 0 ? 0 : Math.max(3, Math.round((count / max) * 100))
  return (
    <div className="flex items-center gap-2 py-0.5">
      <span className="w-20 text-right text-xs text-muted-foreground shrink-0 truncate">{label}</span>
      <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-5 text-xs text-muted-foreground text-right">{count}</span>
    </div>
  )
}

export default function UsersOverview({ users, memberCategories, ministries, lastServiceStats }: Props) {
  const [demoView, setDemoView] = useState<DemoView>("age")

  const newCount = useMemo(() => {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - 30)
    return users.filter((u) => new Date(u.createdAt) >= cutoff).length
  }, [users])

  const ageBuckets = useMemo(() => {
    const b: Record<string, number> = {
      "Under 18": 0, "18–24": 0, "25–34": 0, "35–44": 0,
      "45–54": 0, "55–64": 0, "65+": 0, "Unknown": 0,
    }
    for (const u of users) {
      const age = computeAge(u.birthday)
      if (age === null) { b["Unknown"]++; continue }
      if (age < 18) b["Under 18"]++
      else if (age < 25) b["18–24"]++
      else if (age < 35) b["25–34"]++
      else if (age < 45) b["35–44"]++
      else if (age < 55) b["45–54"]++
      else if (age < 65) b["55–64"]++
      else b["65+"]++
    }
    return b
  }, [users])

  const genderBuckets = useMemo(() => {
    const b: Record<string, number> = {}
    for (const u of users) {
      const key = u.gender ?? "Unknown"
      b[key] = (b[key] ?? 0) + 1
    }
    return Object.entries(b).sort((a, b) => b[1] - a[1])
  }, [users])

  const ministryBuckets = useMemo(() => {
    const b: Record<string, { count: number; color: string }> = { "None": { count: 0, color: "gray" } }
    for (const m of ministries) b[m.name] = { count: 0, color: m.color }
    for (const u of users) {
      const key = u.ministry?.name ?? "None"
      if (!b[key]) b[key] = { count: 0, color: u.ministry?.color ?? "gray" }
      b[key].count++
    }
    return Object.entries(b).sort((a, b) => b[1].count - a[1].count)
  }, [users, ministries])

  const categoryBuckets = useMemo(() => {
    const b: Record<string, { count: number; color: string }> = { "None": { count: 0, color: "gray" } }
    for (const c of memberCategories) b[c.name] = { count: 0, color: c.color }
    for (const u of users) {
      const key = u.memberCategory?.name ?? "None"
      if (!b[key]) b[key] = { count: 0, color: u.memberCategory?.color ?? "gray" }
      b[key].count++
    }
    return Object.entries(b).sort((a, b) => b[1].count - a[1].count)
  }, [users, memberCategories])

  const demoBars = useMemo(() => {
    if (demoView === "age")
      return Object.entries(ageBuckets).map(([label, count]) => ({ label, count, color: "bg-blue-400" }))
    if (demoView === "gender")
      return genderBuckets.map(([label, count]) => ({ label, count, color: "bg-purple-400" }))
    return ministryBuckets.map(([label, { count, color }]) => ({ label, count, color: COLOR_BAR[color] ?? "bg-gray-400" }))
  }, [demoView, ageBuckets, genderBuckets, ministryBuckets])

  const demoMax = Math.max(...demoBars.map((b) => b.count), 1)
  const catMax = Math.max(...categoryBuckets.map(([, v]) => v.count), 1)

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {/* Demographics — spans 2 cols */}
      <Card className="md:col-span-2">
        <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
            <BarChart2 className="h-4 w-4" /> Demographics
          </CardTitle>
          <div className="flex gap-1">
            {(["age", "gender", "ministry"] as DemoView[]).map((v) => (
              <button
                key={v}
                onClick={() => setDemoView(v)}
                className={`text-xs px-2 py-0.5 rounded font-medium transition-colors ${
                  demoView === v
                    ? "bg-foreground text-background"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {v === "age" ? "Age" : v === "gender" ? "Gender" : "Ministry"}
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent className="space-y-0.5">
          {demoBars.map(({ label, count, color }) => (
            <HBar key={label} label={label} count={count} max={demoMax} color={color} />
          ))}
        </CardContent>
      </Card>

      {/* Member Categories — spans 2 cols */}
      <Card className="md:col-span-2">
        <CardHeader className="pb-2 space-y-0">
          <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
            <Users className="h-4 w-4" /> Member Categories
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-0.5">
          {categoryBuckets.map(([label, { count, color }]) => (
            <HBar key={label} label={label} count={count} max={catMax}
              color={CATEGORY_COLORS[color] ? COLOR_BAR[color] : "bg-gray-400"} />
          ))}
          {categoryBuckets.length === 0 && (
            <p className="text-xs text-muted-foreground">No categories defined.</p>
          )}
        </CardContent>
      </Card>

      {/* Last Service */}
      <Card className="md:col-span-2">
        <CardHeader className="pb-2 space-y-0">
          <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
            <CalendarDays className="h-4 w-4" /> Last Service
          </CardTitle>
        </CardHeader>
        <CardContent>
          {lastServiceStats ? (
            <div className="flex items-end gap-4">
              <div>
                <p className="text-3xl font-bold leading-none">{lastServiceStats.headcount}</p>
                <p className="text-xs text-muted-foreground mt-1">volunteers scheduled</p>
              </div>
              <div className="pb-0.5">
                <p className="text-sm font-medium truncate">{lastServiceStats.title || "Service"}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(lastServiceStats.date).toLocaleDateString("en-US", {
                    weekday: "long", month: "short", day: "numeric",
                  })}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No recent services found.</p>
          )}
        </CardContent>
      </Card>

      {/* New Accounts */}
      <Card className="md:col-span-2">
        <CardHeader className="pb-2 space-y-0">
          <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
            <UserPlus className="h-4 w-4" /> New Accounts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-4">
            <div>
              <p className="text-3xl font-bold leading-none">{newCount}</p>
              <p className="text-xs text-muted-foreground mt-1">joined in last 30 days</p>
            </div>
            <div className="pb-0.5">
              <p className="text-sm font-medium">{users.length} total</p>
              <p className="text-xs text-muted-foreground">members in directory</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
