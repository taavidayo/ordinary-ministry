"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { CATEGORY_COLORS } from "@/lib/category-colors"

interface Category { id: string; name: string; color: string }
interface Template { id: string; name: string }
interface Series { id: string; name: string }

interface Props {
  categories: Category[]
  templates: Template[]
  allSeries: Series[]
  onSuccess?: (ids: string[]) => void
  onClose?: () => void
}

export default function NewServiceForm({ categories, templates, allSeries, onSuccess, onClose }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [title, setTitle] = useState("")
  const [categoryId, setCategoryId] = useState("")
  const [seriesId, setSeriesId] = useState("")
  const [templateId, setTemplateId] = useState("")
  const [notes, setNotes] = useState("")
  const [firstDate, setFirstDate] = useState("")
  const [quantity, setQuantity] = useState(1)

  function handleCategoryChange(val: string) {
    setCategoryId(val)
  }

  // Generate N dates spaced 7 days apart from the first date
  function generateDates(): string[] {
    if (!firstDate) return []
    const dates: string[] = []
    const base = new Date(firstDate + "T00:00:00")
    for (let i = 0; i < quantity; i++) {
      const d = new Date(base)
      d.setDate(d.getDate() + i * 7)
      dates.push(d.toISOString().split("T")[0])
    }
    return dates
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const datesToCreate = generateDates()
    if (datesToCreate.length === 0) return

    setLoading(true)
    const created: { id: string }[] = []

    for (const date of datesToCreate) {
      const res = await fetch("/api/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title || null,
          date,
          notes: notes || null,
          categoryId: categoryId || null,
          seriesId: seriesId || null,
        }),
      })
      if (!res.ok) {
        setLoading(false)
        toast.error(`Failed to create service`)
        return
      }
      created.push(await res.json())
    }

    // Apply template to all created services
    if (templateId) {
      await Promise.all(
        created.map((s) =>
          fetch(`/api/templates/${templateId}/apply`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ serviceId: s.id }),
          })
        )
      )
    }

    setLoading(false)
    toast.success(created.length === 1 ? "Service created" : `${created.length} services created`)

    if (onSuccess) {
      onSuccess(created.map((s) => s.id))
    } else if (created.length === 1) {
      router.push(`/admin/services/${created[0].id}`)
    } else {
      router.push("/admin/services")
    }
  }

  const inDialog = !!onClose

  const formContent = (
    <form onSubmit={handleSubmit} className="space-y-4">

      {/* Category */}
      {categories.length > 0 && (
        <div className="space-y-1">
          <Label>Category *</Label>
          <Select value={categoryId} onValueChange={handleCategoryChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select a category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((c) => {
                const colors = CATEGORY_COLORS[c.color] ?? CATEGORY_COLORS.gray
                return (
                  <SelectItem key={c.id} value={c.id}>
                    <span className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full inline-block ${colors.dot}`} />
                      {c.name}
                    </span>
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Title */}
      <div className="space-y-1">
        <Label>Title</Label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Optional"
        />
      </div>

      {/* Series */}
      {allSeries.length > 0 && (
        <div className="space-y-1">
          <Label>Series</Label>
          <Select value={seriesId} onValueChange={(v) => setSeriesId(v === "none" ? "" : v)}>
            <SelectTrigger>
              <SelectValue placeholder="None" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              {allSeries.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Template */}
      {templates.length > 0 && (
        <div className="space-y-1">
          <Label>Template</Label>
          <Select value={templateId} onValueChange={(v) => setTemplateId(v === "none" ? "" : v)}>
            <SelectTrigger>
              <SelectValue placeholder="None (start blank)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None (start blank)</SelectItem>
              {templates.map((t) => (
                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Notes */}
      <div className="space-y-1">
        <Label>Notes</Label>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
        />
      </div>

      {/* Date + Quantity */}
      <div className="space-y-3">
        <div className="space-y-1">
          <Label>First Date *</Label>
          <Input
            type="date"
            value={firstDate}
            onChange={(e) => setFirstDate(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1">
          <Label>Quantity</Label>
          <Input
            type="number"
            min={1}
            max={52}
            value={quantity}
            onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
            className="w-24"
          />
          {quantity > 1 && firstDate && (
            <p className="text-xs text-muted-foreground">
              Creates {quantity} services every 7 days starting{" "}
              {new Date(firstDate + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
            </p>
          )}
        </div>
      </div>

      <div className="flex gap-2 pt-2">
        <Button type="submit" disabled={loading || !firstDate || (categories.length > 0 && !categoryId)}>
          {loading
            ? "Creating…"
            : quantity > 1
            ? `Create ${quantity} Services`
            : "Create Service"}
        </Button>
        <Button type="button" variant="outline" onClick={() => onClose ? onClose() : router.back()}>Cancel</Button>
      </div>
    </form>
  )

  if (inDialog) return formContent

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-bold mb-4">New Service</h1>
      <Card>
        <CardHeader><CardTitle className="text-base">Service details</CardTitle></CardHeader>
        <CardContent>{formContent}</CardContent>
      </Card>
    </div>
  )
}
