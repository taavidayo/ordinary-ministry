"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Pencil, Trash2, Plus, Check, X } from "lucide-react"
import { CATEGORY_COLORS, COLOR_OPTIONS, ROLE_LABELS, ROLE_BADGE } from "@/lib/category-colors"

type MinRole = "VISITOR" | "MEMBER" | "LEADER" | "ADMIN"

interface Category {
  id: string
  name: string
  description: string | null
  color: string
  minRole: MinRole
  order: number
  _count: { services: number }
}

interface FormState {
  name: string
  description: string
  color: string
  minRole: MinRole
}

const DEFAULT_FORM: FormState = { name: "", description: "", color: "gray", minRole: "MEMBER" }

interface Props {
  initialCategories: Category[]
}

export default function ServiceCategoryManager({ initialCategories }: Props) {
  const [categories, setCategories] = useState(initialCategories)
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [addForm, setAddForm] = useState<FormState>(DEFAULT_FORM)
  const [editForm, setEditForm] = useState<FormState>(DEFAULT_FORM)

  async function handleAdd() {
    if (!addForm.name.trim()) { toast.error("Name is required"); return }
    const res = await fetch("/api/service-categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(addForm),
    })
    if (res.ok) {
      const cat = await res.json()
      setCategories([...categories, cat])
      setAddForm(DEFAULT_FORM)
      setAdding(false)
      toast.success("Category created")
    } else {
      const err = await res.json()
      toast.error(err.error ?? "Failed to create category")
    }
  }

  function startEdit(cat: Category) {
    setEditingId(cat.id)
    setEditForm({ name: cat.name, description: cat.description ?? "", color: cat.color, minRole: cat.minRole })
  }

  async function handleEdit(id: string) {
    const res = await fetch(`/api/service-categories/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    })
    if (res.ok) {
      const updated = await res.json()
      setCategories(categories.map((c) => c.id === id ? { ...c, ...updated } : c))
      setEditingId(null)
      toast.success("Category updated")
    } else {
      const err = await res.json()
      toast.error(err.error ?? "Failed to update category")
    }
  }

  async function handleDelete(id: string) {
    const cat = categories.find((c) => c.id === id)
    if (cat && cat._count.services > 0) {
      toast.error(`Remove this category's ${cat._count.services} service(s) first, or they'll become uncategorized.`)
    }
    const res = await fetch(`/api/service-categories/${id}`, { method: "DELETE" })
    if (res.ok) {
      setCategories(categories.filter((c) => c.id !== id))
      toast.success("Category deleted")
    } else {
      toast.error("Failed to delete category")
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {categories.length} {categories.length === 1 ? "category" : "categories"}
        </p>
        <Button size="sm" onClick={() => { setAdding(true); setEditingId(null) }}>
          <Plus className="h-4 w-4 mr-1" /> Add Category
        </Button>
      </div>

      {adding && (
        <CategoryForm
          form={addForm}
          onChange={setAddForm}
          onSave={handleAdd}
          onCancel={() => { setAdding(false); setAddForm(DEFAULT_FORM) }}
          saveLabel="Create"
        />
      )}

      <div className="bg-white rounded-lg border divide-y">
        {categories.length === 0 && !adding && (
          <p className="text-sm text-muted-foreground text-center py-8">
            No categories yet. Add your first one.
          </p>
        )}
        {categories.map((cat) => {
          const colors = CATEGORY_COLORS[cat.color] ?? CATEGORY_COLORS.gray
          return (
            <div key={cat.id}>
              {editingId === cat.id ? (
                <div className="p-3 bg-gray-50">
                  <CategoryForm
                    form={editForm}
                    onChange={setEditForm}
                    onSave={() => handleEdit(cat.id)}
                    onCancel={() => setEditingId(null)}
                    saveLabel="Save"
                  />
                </div>
              ) : (
                <div className="flex items-center justify-between px-4 py-3 gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`w-3 h-3 rounded-full shrink-0 ${colors.dot}`} />
                    <div className="min-w-0">
                      <p className="font-medium text-sm">{cat.name}</p>
                      {cat.description && (
                        <p className="text-xs text-muted-foreground truncate">{cat.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="secondary" className="text-xs">{cat._count.services} services</Badge>
                    <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${ROLE_BADGE[cat.minRole]}`}>
                      {ROLE_LABELS[cat.minRole]}
                    </span>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEdit(cat)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(cat.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function CategoryForm({
  form,
  onChange,
  onSave,
  onCancel,
  saveLabel,
}: {
  form: FormState
  onChange: (f: FormState) => void
  onSave: () => void
  onCancel: () => void
  saveLabel: string
}) {
  return (
    <div className="border rounded-lg p-4 space-y-3 bg-white">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Name *</label>
          <Input
            placeholder="e.g. Sunday Morning"
            value={form.name}
            onChange={(e) => onChange({ ...form, name: e.target.value })}
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Description</label>
          <Input
            placeholder="Optional"
            value={form.description}
            onChange={(e) => onChange({ ...form, description: e.target.value })}
            className="h-8 text-sm"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Color</label>
          <div className="flex gap-1.5 flex-wrap">
            {COLOR_OPTIONS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => onChange({ ...form, color: c })}
                className={`w-6 h-6 rounded-full border-2 transition-all ${CATEGORY_COLORS[c].dot} ${
                  form.color === c ? "border-gray-700 scale-110" : "border-transparent hover:border-gray-400"
                }`}
                title={c}
              />
            ))}
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Visible to</label>
          <Select value={form.minRole} onValueChange={(v) => onChange({ ...form, minRole: v as MinRole })}>
            <SelectTrigger className="h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="MEMBER">All Members</SelectItem>
              <SelectItem value="LEADER">Leaders &amp; Admins</SelectItem>
              <SelectItem value="ADMIN">Admins Only</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex gap-2">
        <Button size="sm" onClick={onSave}>
          <Check className="h-3.5 w-3.5 mr-1" />{saveLabel}
        </Button>
        <Button size="sm" variant="outline" onClick={onCancel}>
          <X className="h-3.5 w-3.5 mr-1" />Cancel
        </Button>
      </div>
    </div>
  )
}
