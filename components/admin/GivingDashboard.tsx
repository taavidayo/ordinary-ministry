"use client"

import { useState, useMemo } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Pencil, Trash2, X, Search, Tags, FileText, Check, AlertTriangle, Eye, EyeOff, Archive, ArchiveRestore } from "lucide-react"
import Link from "next/link"

// ── Types ───────────────────────────────────────────────────────────────────

interface OfferingCategory {
  id: string
  name: string
  color: string
  published: boolean
  archivedAt: string | null
}

interface Offering {
  id: string
  stripePaymentId: string | null
  amount: number
  currency: string
  donorName: string | null
  donorEmail: string | null
  note: string | null
  type: string | null
  categoryId: string | null
  category: { id: string; name: string; color: string } | null
  recurring: boolean
  createdAt: string
}

interface Props {
  offerings: Offering[]
  categories: OfferingCategory[]
  orgName?: string
  isAdmin: boolean
}

// ── Color helpers ────────────────────────────────────────────────────────────

const COLOR_OPTIONS = [
  { value: "gray",   cls: "bg-gray-500"   },
  { value: "red",    cls: "bg-red-500"    },
  { value: "orange", cls: "bg-orange-500" },
  { value: "yellow", cls: "bg-yellow-500" },
  { value: "green",  cls: "bg-green-500"  },
  { value: "blue",   cls: "bg-blue-500"   },
  { value: "purple", cls: "bg-purple-500" },
  { value: "pink",   cls: "bg-pink-500"   },
  { value: "teal",   cls: "bg-teal-500"   },
]

const COLOR_BADGE: Record<string, string> = {
  gray:   "bg-gray-100 text-gray-700",
  red:    "bg-red-100 text-red-700",
  orange: "bg-orange-100 text-orange-700",
  yellow: "bg-yellow-100 text-yellow-700",
  green:  "bg-green-100 text-green-700",
  blue:   "bg-blue-100 text-blue-700",
  purple: "bg-purple-100 text-purple-700",
  pink:   "bg-pink-100 text-pink-700",
  teal:   "bg-teal-100 text-teal-700",
}

// Hex colors for SVG chart fills
const COLOR_HEX: Record<string, string> = {
  gray:   "#6b7280",
  red:    "#ef4444",
  orange: "#f97316",
  yellow: "#eab308",
  green:  "#22c55e",
  blue:   "#3b82f6",
  purple: "#a855f7",
  pink:   "#ec4899",
  teal:   "#14b8a6",
}

function fmt(cents: number) {
  return "$" + (cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// ── Duplicate detection ──────────────────────────────────────────────────────
// Flags offerings where same donor + same amount appear within 5 minutes

function detectDuplicates(offerings: Offering[]): Set<string> {
  const flagged = new Set<string>()
  const sorted = [...offerings].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
  const WINDOW_MS = 5 * 60 * 1000 // 5 minutes

  for (let i = 0; i < sorted.length; i++) {
    for (let j = i + 1; j < sorted.length; j++) {
      const a = sorted[i]
      const b = sorted[j]
      const timeDiff = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      if (timeDiff > WINDOW_MS) break
      const sameEmail = a.donorEmail && b.donorEmail && a.donorEmail === b.donorEmail
      const sameName = !a.donorEmail && !b.donorEmail && a.donorName && b.donorName && a.donorName === b.donorName
      if ((sameEmail || sameName) && a.amount === b.amount) {
        flagged.add(a.id)
        flagged.add(b.id)
      }
    }
  }
  return flagged
}

// ── SVG Bar Chart ────────────────────────────────────────────────────────────

function BarChart({ data }: { data: { label: string; value: number; color: string }[] }) {
  if (data.length === 0) return <p className="text-sm text-muted-foreground text-center py-6">No data</p>
  const max = Math.max(...data.map(d => d.value), 1)
  const H = 120
  const barW = Math.min(48, Math.floor(400 / data.length) - 8)
  const gap = Math.max(4, Math.floor((400 - data.length * barW) / (data.length + 1)))
  const totalW = data.length * (barW + gap) + gap

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${totalW} ${H + 36}`} className="w-full" style={{ minWidth: Math.min(totalW, 300) }}>
        {data.map((d, i) => {
          const barH = Math.max(4, Math.round((d.value / max) * H))
          const x = gap + i * (barW + gap)
          const y = H - barH
          const hex = COLOR_HEX[d.color] ?? COLOR_HEX.gray
          return (
            <g key={d.label}>
              <rect x={x} y={y} width={barW} height={barH} rx={4} fill={hex} fillOpacity={0.85} />
              <text x={x + barW / 2} y={H + 14} textAnchor="middle" fontSize={10} fill="currentColor" opacity={0.6}>
                {d.label.length > 8 ? d.label.slice(0, 7) + "…" : d.label}
              </text>
              <text x={x + barW / 2} y={y - 4} textAnchor="middle" fontSize={9} fill="currentColor" opacity={0.8}>
                {fmt(d.value)}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

// ── SVG Line/Area Chart (giving over time) ───────────────────────────────────

function TrendChart({ buckets }: { buckets: { label: string; total: number }[] }) {
  if (buckets.length === 0) return null
  const W = 400
  const H = 80
  const max = Math.max(...buckets.map(b => b.total), 1)
  const pts = buckets.map((b, i) => ({
    x: buckets.length === 1 ? W / 2 : (i / (buckets.length - 1)) * W,
    y: H - Math.round((b.total / max) * H * 0.9) - 4,
  }))

  const linePath = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ")
  const areaPath = `${linePath} L${pts[pts.length - 1].x},${H + 4} L${pts[0].x},${H + 4} Z`

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H + 24}`} className="w-full">
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.25" />
            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill="url(#areaGrad)" />
        <path d={linePath} fill="none" stroke="hsl(var(--primary))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {pts.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={3} fill="hsl(var(--primary))" />
        ))}
        {buckets.map((b, i) => (
          <text key={i} x={pts[i].x} y={H + 18} textAnchor="middle" fontSize={9} fill="currentColor" opacity={0.6}>
            {b.label}
          </text>
        ))}
      </svg>
    </div>
  )
}

// ── Component ────────────────────────────────────────────────────────────────

type RangeType = "week" | "month" | "year"

export default function GivingDashboard({ offerings, categories: initCategories, isAdmin }: Props) {
  const [search, setSearch] = useState("")
  const [rangeType, setRangeType] = useState<RangeType>("month")
  const [filterCategoryId, setFilterCategoryId] = useState<string>("all")
  const [categories, setCategories] = useState(initCategories)
  const [showManage, setShowManage] = useState(false)
  const [showArchived, setShowArchived] = useState(false)

  // Category management state
  const [editingCat, setEditingCat] = useState<OfferingCategory | null>(null)
  const [newCatName, setNewCatName] = useState("")
  const [newCatColor, setNewCatColor] = useState("gray")
  const [catSaving, setCatSaving] = useState(false)

  // ── Range ──────────────────────────────────────────────────────────────────
  const rangeStart = useMemo(() => {
    const d = new Date()
    if (rangeType === "week")  { d.setDate(d.getDate() - 7);      return d }
    if (rangeType === "month") { d.setMonth(d.getMonth() - 1);    return d }
    d.setFullYear(d.getFullYear() - 1); return d
  }, [rangeType])

  // ── Duplicate detection ────────────────────────────────────────────────────
  const duplicates = useMemo(() => detectDuplicates(offerings), [offerings])

  // ── Filtered offerings ─────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return offerings.filter(o => {
      if (new Date(o.createdAt) < rangeStart) return false
      if (filterCategoryId !== "all" && o.categoryId !== filterCategoryId) return false
      if (q) {
        const hit = o.donorName?.toLowerCase().includes(q)
          || o.donorEmail?.toLowerCase().includes(q)
          || o.stripePaymentId?.toLowerCase().includes(q)
          || o.id.toLowerCase().includes(q)
        if (!hit) return false
      }
      return true
    })
  }, [offerings, rangeStart, filterCategoryId, search])

  // ── Metrics ────────────────────────────────────────────────────────────────
  const total = filtered.reduce((s, o) => s + o.amount, 0)
  const count = filtered.length
  const recurring = filtered.filter(o => o.recurring).length
  const duplicatesInRange = filtered.filter(o => duplicates.has(o.id)).length

  const byCategory = useMemo(() => {
    const map = new Map<string, { name: string; color: string; total: number; count: number }>()
    for (const o of filtered) {
      const key = o.categoryId ?? "__none__"
      const name = o.category?.name ?? o.type ?? "Uncategorized"
      const color = o.category?.color ?? "gray"
      if (!map.has(key)) map.set(key, { name, color, total: 0, count: 0 })
      const e = map.get(key)!
      e.total += o.amount
      e.count++
    }
    return [...map.values()].sort((a, b) => b.total - a.total)
  }, [filtered])

  // ── Time-series buckets ────────────────────────────────────────────────────
  const trendBuckets = useMemo(() => {
    if (filtered.length === 0) return []
    if (rangeType === "week") {
      // Daily buckets for last 7 days
      const buckets: { label: string; total: number }[] = []
      for (let i = 6; i >= 0; i--) {
        const d = new Date()
        d.setDate(d.getDate() - i)
        const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
        const total = filtered
          .filter(o => new Date(o.createdAt).toDateString() === d.toDateString())
          .reduce((s, o) => s + o.amount, 0)
        buckets.push({ label, total })
      }
      return buckets
    } else if (rangeType === "month") {
      // Weekly buckets (4 weeks)
      const buckets: { label: string; total: number }[] = []
      for (let i = 3; i >= 0; i--) {
        const end = new Date()
        end.setDate(end.getDate() - i * 7)
        const start = new Date(end)
        start.setDate(start.getDate() - 7)
        const label = start.toLocaleDateString("en-US", { month: "short", day: "numeric" })
        const total = filtered
          .filter(o => { const t = new Date(o.createdAt); return t >= start && t < end })
          .reduce((s, o) => s + o.amount, 0)
        buckets.push({ label, total })
      }
      return buckets
    } else {
      // Monthly buckets for last 12 months
      const buckets: { label: string; total: number }[] = []
      for (let i = 11; i >= 0; i--) {
        const d = new Date()
        d.setMonth(d.getMonth() - i, 1)
        const label = d.toLocaleDateString("en-US", { month: "short" })
        const total = filtered
          .filter(o => {
            const t = new Date(o.createdAt)
            return t.getMonth() === d.getMonth() && t.getFullYear() === d.getFullYear()
          })
          .reduce((s, o) => s + o.amount, 0)
        buckets.push({ label, total })
      }
      return buckets
    }
  }, [filtered, rangeType])

  // ── Category CRUD ──────────────────────────────────────────────────────────
  async function addCategory() {
    if (!newCatName.trim()) return
    setCatSaving(true)
    const res = await fetch("/api/offering-categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newCatName.trim(), color: newCatColor }),
    })
    setCatSaving(false)
    if (res.ok) {
      const cat = await res.json()
      setCategories(prev => [...prev, cat].sort((a, b) => a.name.localeCompare(b.name)))
      setNewCatName(""); setNewCatColor("gray")
    } else { toast.error("Failed to add category") }
  }

  async function updateCategory(id: string, patch: Partial<OfferingCategory>) {
    const res = await fetch(`/api/offering-categories/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    })
    if (res.ok) {
      const updated = await res.json()
      setCategories(prev => prev.map(c => c.id === id ? { ...c, ...updated } : c))
      setEditingCat(null)
    } else { toast.error("Failed to update") }
  }

  async function deleteCategory(id: string) {
    const res = await fetch(`/api/offering-categories/${id}`, { method: "DELETE" })
    if (res.ok || res.status === 204) {
      setCategories(prev => prev.filter(c => c.id !== id))
      if (filterCategoryId === id) setFilterCategoryId("all")
    } else { toast.error("Failed to delete") }
  }

  // ── Derived category lists ─────────────────────────────────────────────────
  const activeCategories = categories.filter(c => !c.archivedAt)
  const archivedCategories = categories.filter(c => c.archivedAt)

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-2xl font-bold">Giving</h1>
        <div className="flex gap-2 flex-wrap items-center">
          {/* Time range select */}
          <Select value={rangeType} onValueChange={v => setRangeType(v as RangeType)}>
            <SelectTrigger className="h-8 w-40 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Last 7 Days</SelectItem>
              <SelectItem value="month">Last 30 Days</SelectItem>
              <SelectItem value="year">Last 12 Months</SelectItem>
            </SelectContent>
          </Select>
          {isAdmin && (
            <Button variant="outline" size="sm" onClick={() => setShowManage(true)}>
              <Tags className="h-3.5 w-3.5 mr-1.5" /> Manage Categories
            </Button>
          )}
        </div>
      </div>

      {/* Duplicate warning banner */}
      {duplicatesInRange > 0 && (
        <div className="flex items-start gap-2.5 rounded-lg border border-yellow-300 bg-yellow-50 dark:bg-yellow-950/30 dark:border-yellow-700 px-4 py-3">
          <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-yellow-800 dark:text-yellow-300">Possible Duplicate Transactions</p>
            <p className="text-xs text-yellow-700 dark:text-yellow-400 mt-0.5">
              {duplicatesInRange} transaction{duplicatesInRange !== 1 ? "s" : ""} in the current view may be duplicates — same donor, same amount, within 5 minutes. Review rows highlighted below.
            </p>
          </div>
        </div>
      )}

      {/* Metric cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Total Giving</p>
          <p className="text-2xl font-bold mt-0.5">{fmt(total)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Transactions</p>
          <p className="text-2xl font-bold mt-0.5">{count}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Recurring</p>
          <p className="text-2xl font-bold mt-0.5">{recurring}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Avg. Gift</p>
          <p className="text-2xl font-bold mt-0.5">{count > 0 ? fmt(Math.round(total / count)) : "—"}</p>
        </Card>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Trend chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Giving Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <TrendChart buckets={trendBuckets} />
          </CardContent>
        </Card>

        {/* Category bar chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">By Category</CardTitle>
          </CardHeader>
          <CardContent>
            {byCategory.length > 0 ? (
              <BarChart data={byCategory.map(c => ({ label: c.name, value: c.total, color: c.color }))} />
            ) : (
              <p className="text-sm text-muted-foreground text-center py-6">No data</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Search + category filter */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            className="pl-8 h-9"
            placeholder="Search by name, email, or transaction ID…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <Select value={filterCategoryId} onValueChange={setFilterCategoryId}>
          <SelectTrigger className="h-9 w-44 text-xs">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {activeCategories.map(cat => (
              <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Transactions table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Donor</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Transaction ID</TableHead>
                <TableHead>Note</TableHead>
                {isAdmin && <TableHead />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(o => {
                const isDuplicate = duplicates.has(o.id)
                return (
                  <TableRow key={o.id} className={isDuplicate ? "bg-yellow-50/60 dark:bg-yellow-950/20" : undefined}>
                    <TableCell className="text-sm whitespace-nowrap">
                      {new Date(o.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        {isDuplicate && (
                          <AlertTriangle className="h-3.5 w-3.5 text-yellow-500 shrink-0" />
                        )}
                        <div>
                          <p className="font-medium text-sm">{o.donorName || "Anonymous"}</p>
                          {o.donorEmail && <p className="text-xs text-muted-foreground">{o.donorEmail}</p>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-semibold whitespace-nowrap">{fmt(o.amount)}</TableCell>
                    <TableCell>
                      {o.category ? (
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${COLOR_BADGE[o.category.color] ?? COLOR_BADGE.gray}`}>
                          {o.category.name}
                        </span>
                      ) : o.type ? (
                        <Badge variant="outline" className="text-xs capitalize">{o.type}</Badge>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      {o.recurring && <Badge variant="secondary" className="text-xs">Monthly</Badge>}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground font-mono max-w-[120px] truncate" title={o.stripePaymentId ?? o.id}>
                      {o.stripePaymentId ?? o.id}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[160px] truncate">{o.note}</TableCell>
                    {isAdmin && (
                      <TableCell>
                        {o.donorEmail && (
                          <Link href={`/mychurch/giving/statement?email=${encodeURIComponent(o.donorEmail)}&year=${new Date(o.createdAt).getFullYear()}`}>
                            <Button variant="ghost" size="icon" className="h-6 w-6" title="Tax statement">
                              <FileText className="h-3.5 w-3.5" />
                            </Button>
                          </Link>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                )
              })}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={isAdmin ? 8 : 7} className="text-center text-muted-foreground py-10">
                    No records found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Manage Categories dialog (admin only) */}
      {isAdmin && (
        <Dialog open={showManage} onOpenChange={setShowManage}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Manage Giving Categories</DialogTitle></DialogHeader>
            <div className="space-y-4 mt-2">
              {/* Add new */}
              <div className="flex gap-2 items-center">
                <Input
                  placeholder="Category name…"
                  value={newCatName}
                  onChange={e => setNewCatName(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && addCategory()}
                  className="flex-1 h-8 text-sm"
                />
                <div className="flex gap-1">
                  {COLOR_OPTIONS.map(c => (
                    <button
                      key={c.value}
                      type="button"
                      className={`h-5 w-5 rounded-full ${c.cls} ${newCatColor === c.value ? "ring-2 ring-offset-1 ring-foreground/40" : ""}`}
                      onClick={() => setNewCatColor(c.value)}
                    />
                  ))}
                </div>
                <Button size="sm" className="h-8" onClick={addCategory} disabled={catSaving || !newCatName.trim()}>
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>

              {/* Active categories */}
              <div className="space-y-1.5 max-h-72 overflow-y-auto">
                {activeCategories.map(cat => (
                  <div key={cat.id}>
                    {editingCat?.id === cat.id ? (
                      <InlineCatEdit
                        cat={editingCat}
                        onChange={setEditingCat}
                        onSave={() => updateCategory(editingCat.id, { name: editingCat.name, color: editingCat.color })}
                        onCancel={() => setEditingCat(null)}
                      />
                    ) : (
                      <div className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-accent group">
                        <span className={`h-3 w-3 rounded-full shrink-0 ${COLOR_OPTIONS.find(c => c.value === cat.color)?.cls ?? "bg-gray-500"}`} />
                        <span className="flex-1 text-sm">{cat.name}</span>
                        {!cat.published && (
                          <span className="text-xs text-muted-foreground italic">unpublished</span>
                        )}
                        {/* Toggle published */}
                        <button
                          className="opacity-0 group-hover:opacity-100 h-5 w-5 flex items-center justify-center rounded text-muted-foreground hover:text-foreground"
                          title={cat.published ? "Unpublish" : "Publish"}
                          onClick={() => updateCategory(cat.id, { published: !cat.published })}
                        >
                          {cat.published ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                        </button>
                        <button
                          className="opacity-0 group-hover:opacity-100 h-5 w-5 flex items-center justify-center rounded text-muted-foreground hover:text-foreground"
                          onClick={() => setEditingCat({ ...cat })}
                        ><Pencil className="h-3 w-3" /></button>
                        <button
                          className="opacity-0 group-hover:opacity-100 h-5 w-5 flex items-center justify-center rounded text-muted-foreground hover:text-amber-600"
                          title="Archive"
                          onClick={() => updateCategory(cat.id, { archived: true } as unknown as Partial<OfferingCategory>)}
                        ><Archive className="h-3 w-3" /></button>
                        <button
                          className="opacity-0 group-hover:opacity-100 h-5 w-5 flex items-center justify-center rounded text-muted-foreground hover:text-destructive"
                          onClick={() => deleteCategory(cat.id)}
                        ><Trash2 className="h-3 w-3" /></button>
                      </div>
                    )}
                  </div>
                ))}
                {activeCategories.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">No categories yet.</p>
                )}
              </div>

              {/* Archived section */}
              {archivedCategories.length > 0 && (
                <div>
                  <button
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-1.5"
                    onClick={() => setShowArchived(v => !v)}
                  >
                    <Archive className="h-3 w-3" />
                    {showArchived ? "Hide" : "Show"} archived ({archivedCategories.length})
                  </button>
                  {showArchived && (
                    <div className="space-y-1.5 max-h-40 overflow-y-auto opacity-60">
                      {archivedCategories.map(cat => (
                        <div key={cat.id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-accent group">
                          <span className={`h-3 w-3 rounded-full shrink-0 ${COLOR_OPTIONS.find(c => c.value === cat.color)?.cls ?? "bg-gray-500"}`} />
                          <span className="flex-1 text-sm line-through">{cat.name}</span>
                          <button
                            className="opacity-0 group-hover:opacity-100 h-5 w-5 flex items-center justify-center rounded text-muted-foreground hover:text-foreground"
                            title="Restore"
                            onClick={() => updateCategory(cat.id, { archived: false } as unknown as Partial<OfferingCategory>)}
                          ><ArchiveRestore className="h-3 w-3" /></button>
                          <button
                            className="opacity-0 group-hover:opacity-100 h-5 w-5 flex items-center justify-center rounded text-muted-foreground hover:text-destructive"
                            onClick={() => deleteCategory(cat.id)}
                          ><Trash2 className="h-3 w-3" /></button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

// ── Inline category edit ────────────────────────────────────────────────────

function InlineCatEdit({
  cat, onChange, onSave, onCancel,
}: {
  cat: OfferingCategory
  onChange: (c: OfferingCategory) => void
  onSave: () => void
  onCancel: () => void
}) {
  return (
    <div className="flex items-center gap-2 px-2 py-1">
      <Input
        value={cat.name}
        onChange={e => onChange({ ...cat, name: e.target.value })}
        className="flex-1 h-7 text-sm"
        autoFocus
        onKeyDown={e => { if (e.key === "Enter") onSave(); if (e.key === "Escape") onCancel() }}
      />
      <div className="flex gap-0.5">
        {COLOR_OPTIONS.map(c => (
          <button
            key={c.value}
            type="button"
            className={`h-4 w-4 rounded-full ${c.cls} ${cat.color === c.value ? "ring-2 ring-offset-1 ring-foreground/40" : ""}`}
            onClick={() => onChange({ ...cat, color: c.value })}
          />
        ))}
      </div>
      <Button size="sm" className="h-7 px-2" onClick={onSave}><Check className="h-3 w-3" /></Button>
      <Button size="sm" variant="ghost" className="h-7 px-2" onClick={onCancel}><X className="h-3 w-3" /></Button>
    </div>
  )
}
