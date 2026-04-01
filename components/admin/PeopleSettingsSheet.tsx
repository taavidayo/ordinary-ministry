"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "sonner"
import { Settings, Plus, Trash2, Pencil, Check, X, CheckCircle2, AlertCircle, SkipForward } from "lucide-react"
import { CATEGORY_COLORS, COLOR_OPTIONS } from "@/lib/category-colors"

// ─── Types ───────────────────────────────────────────────────────────────────

interface MemberCategory { id: string; name: string; color: string }
interface Ministry { id: string; name: string; color: string; description?: string | null }

interface ImportRow { name: string; email: string; phone: string; birthday: string; gender: string; address: string }
interface ImportResult { created: number; skipped: number; errors: string[] }

// ─── Shared ──────────────────────────────────────────────────────────────────

function ColorBadge({ name, color }: { name: string; color: string }) {
  const c = CATEGORY_COLORS[color] ?? CATEGORY_COLORS.gray
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded font-medium ${c.bg} ${c.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {name}
    </span>
  )
}

function ManageItem({
  id, name, color,
  onSave, onDelete,
}: {
  id: string; name: string; color: string
  onSave: (id: string, name: string, color: string) => Promise<void>
  onDelete: (id: string) => Promise<void>
}) {
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState(name)
  const [editColor, setEditColor] = useState(color)
  const [saving, setSaving] = useState(false)

  async function save() {
    if (!editName.trim()) return
    setSaving(true)
    await onSave(id, editName.trim(), editColor)
    setSaving(false)
    setEditing(false)
  }

  if (editing) {
    return (
      <div className="flex items-center gap-2 py-1.5">
        <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="h-7 text-sm flex-1" onKeyDown={(e) => e.key === "Enter" && save()} />
        <div className="flex gap-1">
          {COLOR_OPTIONS.map((c) => (
            <button key={c} type="button" onClick={() => setEditColor(c)}
              className={`w-4 h-4 rounded-full ${CATEGORY_COLORS[c].dot} ${editColor === c ? "ring-2 ring-offset-1 ring-gray-400" : ""}`} />
          ))}
        </div>
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={save} disabled={saving}>
          <Check className="h-3.5 w-3.5 text-green-600" />
        </Button>
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditing(false)}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 py-1.5">
      <ColorBadge name={name} color={color} />
      <div className="flex-1" />
      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditing(true)}>
        <Pencil className="h-3.5 w-3.5" />
      </Button>
      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => onDelete(id)}>
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  )
}

// ─── CSV helpers ─────────────────────────────────────────────────────────────

function parseCSV(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ""
  let inQuotes = false
  let i = 0

  while (i < text.length) {
    const ch = text[i]
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') { field += '"'; i += 2; continue }
      else if (ch === '"') { inQuotes = false }
      else { field += ch }
    } else {
      if (ch === '"') { inQuotes = true }
      else if (ch === ',') { row.push(field.trim()); field = "" }
      else if (ch === '\n' || (ch === '\r' && text[i + 1] === '\n')) {
        if (ch === '\r') i++
        row.push(field.trim())
        if (row.some((f) => f !== "")) rows.push(row)
        row = []; field = ""
      } else if (ch === '\r') {
        row.push(field.trim())
        if (row.some((f) => f !== "")) rows.push(row)
        row = []; field = ""
      } else { field += ch }
    }
    i++
  }
  row.push(field.trim())
  if (row.some((f) => f !== "")) rows.push(row)
  return rows
}

function col(headers: string[], row: string[], ...names: string[]): string {
  for (const name of names) {
    const idx = headers.findIndex((h) => h.toLowerCase() === name.toLowerCase())
    if (idx !== -1 && row[idx]) return row[idx].trim()
  }
  return ""
}

function mapRows(headers: string[], dataRows: string[][]): ImportRow[] {
  return dataRows.map((row) => {
    const firstName = col(headers, row, "First Name", "first_name", "firstname")
    const lastName = col(headers, row, "Last Name", "last_name", "lastname")
    const name = [firstName, lastName].filter(Boolean).join(" ") || col(headers, row, "Name", "Full Name", "full_name")
    const email = col(headers, row, "Email", "Email 1", "email_1", "Primary Email", "primary_email")
    const phone = col(headers, row, "Phone", "Phone 1", "phone_1", "Mobile", "Cell", "Primary Phone", "primary_phone")
    const birthday = col(headers, row, "Birthdate", "Birthday", "birth_date", "Date of Birth", "dob")
    const gender = col(headers, row, "Gender", "Sex")
    const street = col(headers, row, "Street", "Address", "Street Address", "street_address")
    const city = col(headers, row, "City")
    const state = col(headers, row, "State")
    const zip = col(headers, row, "Zip", "Postal Code", "ZIP Code")
    const address = [street, city, state, zip].filter(Boolean).join(", ")
    return { name, email, phone, birthday, gender, address }
  })
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function PeopleSettingsSheet({
  memberCategories: initCats,
  ministries: initMins,
  onCategoriesChange,
  onMinistriesChange,
  onImported,
}: {
  memberCategories: MemberCategory[]
  ministries: Ministry[]
  onCategoriesChange: (cats: MemberCategory[]) => void
  onMinistriesChange: (mins: Ministry[]) => void
  onImported: () => void
}) {
  // ── Categories state ──
  const [cats, setCats] = useState(initCats)
  const [newCatName, setNewCatName] = useState("")
  const [newCatColor, setNewCatColor] = useState("gray")
  const [addingCat, setAddingCat] = useState(false)

  // ── Ministries state ──
  const [mins, setMins] = useState(initMins)
  const [newMinName, setNewMinName] = useState("")
  const [newMinColor, setNewMinColor] = useState("blue")
  const [addingMin, setAddingMin] = useState(false)

  // ── Import state ──
  const [parsed, setParsed] = useState<ImportRow[] | null>(null)
  const [fileName, setFileName] = useState("")
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // ── Categories handlers ──
  async function addCat() {
    if (!newCatName.trim()) return
    setAddingCat(true)
    const res = await fetch("/api/member-categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newCatName.trim(), color: newCatColor }),
    })
    setAddingCat(false)
    if (res.ok) {
      const cat = await res.json()
      const updated = [...cats, cat].sort((a, b) => a.name.localeCompare(b.name))
      setCats(updated); onCategoriesChange(updated)
      setNewCatName(""); setNewCatColor("gray")
    } else { toast.error("Failed to add category") }
  }

  async function saveCat(id: string, name: string, color: string) {
    const res = await fetch(`/api/member-categories/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, color }),
    })
    if (res.ok) {
      const updated = cats.map((c) => (c.id === id ? { ...c, name, color } : c))
      setCats(updated); onCategoriesChange(updated)
    } else { toast.error("Failed to update category") }
  }

  async function deleteCat(id: string) {
    if (!confirm("Delete this category? Users assigned to it will be unassigned.")) return
    const res = await fetch(`/api/member-categories/${id}`, { method: "DELETE" })
    if (res.ok) {
      const updated = cats.filter((c) => c.id !== id)
      setCats(updated); onCategoriesChange(updated)
    } else { toast.error("Failed to delete category") }
  }

  // ── Ministries handlers ──
  async function addMin() {
    if (!newMinName.trim()) return
    setAddingMin(true)
    const res = await fetch("/api/ministries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newMinName.trim(), color: newMinColor }),
    })
    setAddingMin(false)
    if (res.ok) {
      const min = await res.json()
      const updated = [...mins, min].sort((a, b) => a.name.localeCompare(b.name))
      setMins(updated); onMinistriesChange(updated)
      setNewMinName(""); setNewMinColor("blue")
    } else { toast.error("Failed to add ministry") }
  }

  async function saveMin(id: string, name: string, color: string) {
    const res = await fetch(`/api/ministries/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, color }),
    })
    if (res.ok) {
      const updated = mins.map((m) => (m.id === id ? { ...m, name, color } : m))
      setMins(updated); onMinistriesChange(updated)
    } else { toast.error("Failed to update ministry") }
  }

  async function deleteMin(id: string) {
    if (!confirm("Delete this ministry? Users assigned to it will be unassigned.")) return
    const res = await fetch(`/api/ministries/${id}`, { method: "DELETE" })
    if (res.ok) {
      const updated = mins.filter((m) => m.id !== id)
      setMins(updated); onMinistriesChange(updated)
    } else { toast.error("Failed to delete ministry") }
  }

  // ── Import handlers ──
  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name); setImportResult(null)
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      const rows = parseCSV(text)
      if (rows.length < 2) { toast.error("CSV appears to be empty or missing headers"); return }
      const mapped = mapRows(rows[0], rows.slice(1)).filter((r) => r.name || r.email)
      if (mapped.length === 0) { toast.error("No valid rows found — check column names"); return }
      setParsed(mapped)
    }
    reader.readAsText(file)
  }

  function resetImport() {
    setParsed(null); setFileName(""); setImportResult(null)
    if (fileRef.current) fileRef.current.value = ""
  }

  async function runImport() {
    if (!parsed) return
    setImporting(true)
    try {
      const res = await fetch("/api/users/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: parsed }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || "Import failed"); return }
      setImportResult(data)
      if (data.created > 0) onImported()
    } catch { toast.error("Import failed — network error") }
    finally { setImporting(false) }
  }

  const validRows = parsed?.filter((r) => r.name && r.email) ?? []
  const invalidRows = (parsed?.length ?? 0) - validRows.length
  const preview = parsed?.slice(0, 5) ?? []

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings className="h-4 w-4 mr-1" /> Settings
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="mb-4">
          <SheetTitle>People Settings</SheetTitle>
        </SheetHeader>

        <Tabs defaultValue="categories">
          <TabsList className="w-full mb-4">
            <TabsTrigger value="categories" className="flex-1">Categories</TabsTrigger>
            <TabsTrigger value="ministries" className="flex-1">Ministries</TabsTrigger>
            <TabsTrigger value="import" className="flex-1">Import CSV</TabsTrigger>
          </TabsList>

          {/* ── Member Categories ── */}
          <TabsContent value="categories" className="space-y-3">
            <div className="flex gap-2 items-center">
              <Input
                placeholder="New category name"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                className="h-8 text-sm flex-1"
                onKeyDown={(e) => e.key === "Enter" && addCat()}
              />
              <div className="flex gap-1">
                {COLOR_OPTIONS.map((c) => (
                  <button key={c} type="button" onClick={() => setNewCatColor(c)}
                    className={`w-4 h-4 rounded-full ${CATEGORY_COLORS[c].dot} ${newCatColor === c ? "ring-2 ring-offset-1 ring-gray-400" : ""}`} />
                ))}
              </div>
              <Button size="sm" onClick={addCat} disabled={addingCat || !newCatName.trim()}>
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
            <div className="divide-y">
              {cats.length === 0 && <p className="text-sm text-muted-foreground py-4 text-center">No categories yet.</p>}
              {cats.map((cat) => (
                <ManageItem key={cat.id} {...cat} onSave={saveCat} onDelete={deleteCat} />
              ))}
            </div>
          </TabsContent>

          {/* ── Ministries ── */}
          <TabsContent value="ministries" className="space-y-3">
            <div className="flex gap-2 items-center">
              <Input
                placeholder="New ministry name"
                value={newMinName}
                onChange={(e) => setNewMinName(e.target.value)}
                className="h-8 text-sm flex-1"
                onKeyDown={(e) => e.key === "Enter" && addMin()}
              />
              <div className="flex gap-1">
                {COLOR_OPTIONS.map((c) => (
                  <button key={c} type="button" onClick={() => setNewMinColor(c)}
                    className={`w-4 h-4 rounded-full ${CATEGORY_COLORS[c].dot} ${newMinColor === c ? "ring-2 ring-offset-1 ring-gray-400" : ""}`} />
                ))}
              </div>
              <Button size="sm" onClick={addMin} disabled={addingMin || !newMinName.trim()}>
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
            <div className="divide-y">
              {mins.length === 0 && <p className="text-sm text-muted-foreground py-4 text-center">No ministries yet.</p>}
              {mins.map((min) => (
                <ManageItem key={min.id} {...min} onSave={saveMin} onDelete={deleteMin} />
              ))}
            </div>
          </TabsContent>

          {/* ── Import CSV ── */}
          <TabsContent value="import" className="space-y-4">
            {!importResult && (
              <>
                <div className="rounded-md bg-muted px-4 py-3 text-sm text-muted-foreground space-y-1">
                  <p className="font-medium text-foreground">Planning Center export steps:</p>
                  <ol className="list-decimal list-inside space-y-0.5">
                    <li>Go to <strong>People</strong> in Planning Center</li>
                    <li>Click <strong>More Actions → Export</strong></li>
                    <li>Choose <strong>CSV</strong> and download</li>
                    <li>Upload that file below</li>
                  </ol>
                  <p className="pt-1">Existing accounts (matched by email) are skipped. Imported people are set to <strong>Member</strong> role.</p>
                </div>
                <div>
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".csv,text/csv"
                    onChange={handleFile}
                    className="block w-full text-sm text-muted-foreground file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-sm file:font-medium file:bg-muted file:text-foreground hover:file:bg-muted/80 cursor-pointer"
                  />
                  {fileName && <p className="text-xs text-muted-foreground mt-1">{fileName}</p>}
                </div>
              </>
            )}

            {parsed && !importResult && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">
                    {parsed.length} row{parsed.length !== 1 ? "s" : ""} detected
                    {invalidRows > 0 && <span className="text-destructive ml-1">({invalidRows} missing name/email)</span>}
                  </p>
                  <p className="text-xs text-muted-foreground">First {Math.min(5, parsed.length)} shown</p>
                </div>
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Name</TableHead>
                        <TableHead className="text-xs">Email</TableHead>
                        <TableHead className="text-xs">Phone</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {preview.map((row, i) => (
                        <TableRow key={i} className={!row.name || !row.email ? "opacity-40" : ""}>
                          <TableCell className="text-xs py-1.5">{row.name || <span className="text-destructive">—</span>}</TableCell>
                          <TableCell className="text-xs py-1.5">{row.email || <span className="text-destructive">—</span>}</TableCell>
                          <TableCell className="text-xs py-1.5 text-muted-foreground">{row.phone || "—"}</TableCell>
                        </TableRow>
                      ))}
                      {parsed.length > 5 && (
                        <TableRow>
                          <TableCell colSpan={3} className="text-xs text-muted-foreground text-center py-1.5">
                            …and {parsed.length - 5} more
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
                <Button className="w-full" onClick={runImport} disabled={importing || validRows.length === 0}>
                  {importing ? "Importing…" : `Import ${validRows.length} people`}
                </Button>
              </div>
            )}

            {importResult && (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-lg border p-3 text-center">
                    <CheckCircle2 className="h-5 w-5 text-green-500 mx-auto mb-1" />
                    <p className="text-2xl font-bold">{importResult.created}</p>
                    <p className="text-xs text-muted-foreground">Created</p>
                  </div>
                  <div className="rounded-lg border p-3 text-center">
                    <SkipForward className="h-5 w-5 text-yellow-500 mx-auto mb-1" />
                    <p className="text-2xl font-bold">{importResult.skipped}</p>
                    <p className="text-xs text-muted-foreground">Already existed</p>
                  </div>
                  <div className="rounded-lg border p-3 text-center">
                    <AlertCircle className="h-5 w-5 text-destructive mx-auto mb-1" />
                    <p className="text-2xl font-bold">{importResult.errors.length}</p>
                    <p className="text-xs text-muted-foreground">Errors</p>
                  </div>
                </div>
                {importResult.errors.length > 0 && (
                  <div className="rounded-md bg-destructive/10 p-3 space-y-1 max-h-36 overflow-y-auto">
                    {importResult.errors.map((e, i) => (
                      <p key={i} className="text-xs text-destructive">{e}</p>
                    ))}
                  </div>
                )}
                <Button variant="outline" className="w-full" onClick={resetImport}>Import another file</Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  )
}
