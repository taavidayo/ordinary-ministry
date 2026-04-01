"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import {
  Plus, Trash2, GripVertical, X,
  Menu, CornerDownRight, Pencil, Check, Cog,
  Link2, FileText, Home,
} from "lucide-react"
import { type NavConfigData, type NavTreeItem, parseNavConfig, navTreePageSlugs } from "@/lib/nav-config"
import NavEditor from "@/components/admin/NavEditor"

export interface PageInfo {
  id: string
  slug: string
  title: string
  published: boolean
  navLinked: boolean
  navOrder: number
  navLabel: string | null
  navParentSlug: string | null
  metaTitle: string | null
  metaDescription: string | null
  updatedBy: string | null
  updatedAt: Date | string
}

interface Props {
  initialPages: PageInfo[]
  homeExists: boolean
  initialNavConfig: string
  initialHomeSlug: string
}

const SYSTEM_PAGES: { slug: string; title: string }[] = [
  { slug: "home", title: "Home" },
  { slug: "about", title: "About" },
  { slug: "sermons", title: "Sermons" },
  { slug: "events", title: "Events" },
  { slug: "give", title: "Give" },
  { slug: "get-involved", title: "Get Involved" },
  { slug: "contact", title: "Contact" },
]

type DropZone = "before" | "into" | "after"
interface DropInfo { targetId: string; zone: DropZone }

interface PageSettingsForm {
  page: PageInfo
  slug: string
  metaTitle: string
  metaDescription: string
  isHome: boolean
}

function slugify(str: string) {
  return str.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
}

function uid(prefix: string) { return `${prefix}_${Math.random().toString(36).slice(2, 9)}` }

function mergeWithSystemPages(pages: PageInfo[]): PageInfo[] {
  const pageMap = new Map(pages.map(p => [p.slug, p]))
  const result: PageInfo[] = []
  for (const sys of SYSTEM_PAGES) {
    result.push(pageMap.get(sys.slug) ?? {
      id: `__system_${sys.slug}`, slug: sys.slug, title: sys.title,
      published: false, navLinked: false, navOrder: 0,
      navLabel: null, navParentSlug: null, metaTitle: null, metaDescription: null,
      updatedBy: null, updatedAt: new Date(),
    })
  }
  for (const p of pages) {
    if (!SYSTEM_PAGES.some(s => s.slug === p.slug)) result.push(p)
  }
  return result
}

// ── Tree helpers ─────────────────────────────────────────────────────────────

function removeFromTree(tree: NavTreeItem[], id: string): NavTreeItem[] {
  return tree
    .filter(item => item.id !== id)
    .map(item => ({ ...item, children: (item.children ?? []).filter(c => c !== id) }))
}

function findParent(tree: NavTreeItem[], id: string): NavTreeItem | null {
  for (const item of tree) {
    if ((item.children ?? []).includes(id)) return item
  }
  return null
}

function insertTopLevel(tree: NavTreeItem[], entry: NavTreeItem, targetId: string, where: "before" | "after"): NavTreeItem[] {
  const idx = tree.findIndex(i => i.id === targetId)
  if (idx < 0) return [...tree, entry]
  const next = [...tree]
  next.splice(where === "before" ? idx : idx + 1, 0, entry)
  return next
}

function updateSlugInTree(tree: NavTreeItem[], oldSlug: string, newSlug: string): NavTreeItem[] {
  return tree.map(item => ({
    ...item,
    id: item.id === oldSlug ? newSlug : item.id,
    children: (item.children ?? []).map(c => c === oldSlug ? newSlug : c),
  }))
}

// ─────────────────────────────────────────────────────────────────────────────

export default function PagesManager({ initialPages, homeExists, initialNavConfig, initialHomeSlug }: Props) {
  const router = useRouter()
  const [pages, setPages] = useState<PageInfo[]>(() => mergeWithSystemPages(initialPages))
  const [homeSlug, setHomeSlug] = useState(initialHomeSlug)

  // New page dialog
  const [showNew, setShowNew] = useState(false)
  const [newTitle, setNewTitle] = useState("")
  const [newSlug, setNewSlug] = useState("")
  const [creating, setCreating] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Page settings dialog
  const [settingsForm, setSettingsForm] = useState<PageSettingsForm | null>(null)
  const [settingsSaving, setSettingsSaving] = useState(false)

  // Nav
  const [navConfig, setNavConfig] = useState<NavConfigData>(() => parseNavConfig(initialNavConfig))
  const [navEditorOpen, setNavEditorOpen] = useState(false)
  const [navStyleSaving, setNavStyleSaving] = useState(false)

  // Add menu dropdown
  const [addMenuOpen, setAddMenuOpen] = useState(false)
  const addMenuRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (addMenuRef.current && !addMenuRef.current.contains(e.target as Node)) setAddMenuOpen(false)
    }
    if (addMenuOpen) document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [addMenuOpen])

  // Dropdown (folder) editing
  const [editingDropdownId, setEditingDropdownId] = useState<string | null>(null)
  const [editingDropdownLabel, setEditingDropdownLabel] = useState("")

  // Link editing
  const [editingLinkId, setEditingLinkId] = useState<string | null>(null)
  const [editingLinkLabel, setEditingLinkLabel] = useState("")
  const [editingLinkHref, setEditingLinkHref] = useState("")

  // Drag state
  const dragId = useRef<string | null>(null)
  const dragSource = useRef<"nav" | "unlinked" | null>(null)
  const [dropInfo, setDropInfo] = useState<DropInfo | null>(null)
  const [hoveringUnlinked, setHoveringUnlinked] = useState(false)

  const navTree = navConfig.navTree ?? []
  const linkedSlugs = navTreePageSlugs(navTree)
  const unlinked = pages.filter(p => !linkedSlugs.has(p.slug))

  function setNavTree(tree: NavTreeItem[]) {
    setNavConfig(c => ({ ...c, navTree: tree }))
  }

  // ── Auto-save nav ─────────────────────────────────────────────────────────
  const saveNav = useCallback(async (tree: NavTreeItem[], config: NavConfigData) => {
    try {
      await fetch("/api/nav-config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config: { ...config, navTree: tree } }),
      })
      const linkedSet = navTreePageSlugs(tree)
      const updates = pages
        .filter(p => !p.id.startsWith("__system_"))
        .map(p => ({ slug: p.slug, navLinked: linkedSet.has(p.slug), navOrder: 0, navLabel: null, navParentSlug: null }))
      if (updates.length > 0) {
        await fetch("/api/nav-pages", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ updates }),
        })
      }
    } catch { toast.error("Failed to save navigation") }
  }, [pages])

  function applyAndSave(tree: NavTreeItem[]) {
    setNavTree(tree)
    saveNav(tree, navConfig)
  }

  // ── Page settings dialog ──────────────────────────────────────────────────

  function openSettings(page: PageInfo) {
    setSettingsForm({
      page,
      slug: page.slug,
      metaTitle: page.metaTitle ?? "",
      metaDescription: page.metaDescription ?? "",
      isHome: page.slug === homeSlug,
    })
  }

  async function saveSettings() {
    if (!settingsForm) return
    setSettingsSaving(true)
    const { page, slug, metaTitle, metaDescription, isHome } = settingsForm
    const oldSlug = page.slug
    const newSlug = slug.trim()

    try {
      if (page.id.startsWith("__system_")) {
        await fetch("/api/pages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: page.title, slug: oldSlug }),
        })
      }

      const res = await fetch(`/api/pages/${oldSlug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(newSlug !== oldSlug && { slug: newSlug }),
          metaTitle: metaTitle || null,
          metaDescription: metaDescription || null,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        toast.error(err.error || "Failed to save")
        return
      }

      const updated = await res.json()

      setPages(prev => prev.map(p =>
        p.slug === oldSlug
          ? { ...p, slug: updated.slug, metaTitle: updated.metaTitle, metaDescription: updated.metaDescription, id: updated.id }
          : p
      ))

      if (newSlug !== oldSlug) {
        const updatedTree = updateSlugInTree(navTree, oldSlug, newSlug)
        applyAndSave(updatedTree)
      }

      if (isHome && homeSlug !== (newSlug !== oldSlug ? newSlug : oldSlug)) {
        const targetSlug = newSlug !== oldSlug ? newSlug : oldSlug
        await fetch("/api/settings", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ homeSlug: targetSlug }),
        })
        setHomeSlug(targetSlug)
      } else if (!isHome && homeSlug === oldSlug) {
        await fetch("/api/settings", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ homeSlug: "home" }),
        })
        setHomeSlug("home")
      }

      toast.success("Saved")
      setSettingsForm(null)
    } catch { toast.error("Failed to save") }
    finally { setSettingsSaving(false) }
  }

  // ── Drag handlers ─────────────────────────────────────────────────────────

  function startDrag(id: string, source: "nav" | "unlinked") {
    dragId.current = id
    dragSource.current = source
  }

  function calcZone(e: React.DragEvent, isChild: boolean): DropZone {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const y = e.clientY - rect.top
    const h = rect.height
    if (isChild) return y < h / 2 ? "before" : "after"
    if (y < h * 0.3) return "before"
    if (y < h * 0.7) return "into"
    return "after"
  }

  function onRowDragOver(e: React.DragEvent, targetId: string, isChild = false) {
    e.preventDefault()
    setDropInfo({ targetId, zone: calcZone(e, isChild) })
    setHoveringUnlinked(false)
  }

  function onRowDrop(e: React.DragEvent, targetId: string, isChild = false) {
    e.preventDefault()
    const src = dragId.current
    const source = dragSource.current
    if (!src) return
    executeDrop(src, source!, targetId, calcZone(e, isChild))
  }

  function onDragEnd() {
    dragId.current = null
    dragSource.current = null
    setDropInfo(null)
    setHoveringUnlinked(false)
  }

  function executeDrop(srcId: string, source: "nav" | "unlinked", rawTargetId: string, zone: DropZone) {
    const isChildDrop = rawTargetId.startsWith("child:")
    const targetId = isChildDrop ? rawTargetId.slice(6) : rawTargetId
    if (srcId === targetId) { onDragEnd(); return }

    const srcItem = navTree.find(i => i.id === srcId)
    const isSrcFolder = srcItem?.type === "folder"
    const isSrcLink = srcItem?.type === "link"
    const resolvedZone: DropZone = (zone === "into" && (isSrcFolder || isSrcLink || isChildDrop)) ? "after" : zone

    let tree = removeFromTree(navTree, srcId)
    const entry: NavTreeItem = srcItem ?? { id: srcId, type: "page", children: [] }
    const targetParent = findParent(navTree, targetId)

    if (resolvedZone === "into") {
      tree = tree.map(item =>
        item.id === targetId
          ? { ...item, children: [...(item.children ?? []), srcId] }
          : item
      )
    } else if (targetParent) {
      tree = tree.map(item => {
        if (item.id !== targetParent.id) return item
        const siblings = [...(item.children ?? [])]
        const idx = siblings.indexOf(targetId)
        const insertAt = resolvedZone === "before" ? (idx < 0 ? 0 : idx) : (idx < 0 ? siblings.length : idx + 1)
        siblings.splice(insertAt, 0, srcId)
        return { ...item, children: siblings }
      })
    } else {
      tree = insertTopLevel(tree, entry, targetId, resolvedZone === "before" ? "before" : "after")
    }

    applyAndSave(tree)
    onDragEnd()
  }

  function onUnlinkedDragOver(e: React.DragEvent) {
    e.preventDefault()
    if (dragSource.current === "nav") setHoveringUnlinked(true)
    setDropInfo(null)
  }

  function onUnlinkedDrop(e: React.DragEvent) {
    e.preventDefault()
    const src = dragId.current
    if (!src || dragSource.current !== "nav") { onDragEnd(); return }
    applyAndSave(removeFromTree(navTree, src))
    onDragEnd()
  }

  // ── Dropdown (folder) mutations ───────────────────────────────────────────

  function addDropdown() {
    const id = uid("folder")
    applyAndSave([...navTree, { id, type: "folder", label: "Dropdown", children: [] }])
    setEditingDropdownId(id)
    setEditingDropdownLabel("Dropdown")
  }

  function commitDropdownLabel(id: string) {
    applyAndSave(navTree.map(item => item.id === id ? { ...item, label: editingDropdownLabel.trim() || "Dropdown" } : item))
    setEditingDropdownId(null)
  }

  // ── Link mutations ────────────────────────────────────────────────────────

  function addLink() {
    const id = uid("link")
    applyAndSave([...navTree, { id, type: "link", label: "Link", href: "#", children: [] }])
    setEditingLinkId(id)
    setEditingLinkLabel("Link")
    setEditingLinkHref("#")
  }

  function commitLink(id: string) {
    applyAndSave(navTree.map(item =>
      item.id === id
        ? { ...item, label: editingLinkLabel.trim() || "Link", href: editingLinkHref.trim() || "#" }
        : item
    ))
    setEditingLinkId(null)
  }

  function removeFromNav(id: string) { applyAndSave(removeFromTree(navTree, id)) }

  // ── Nav style ─────────────────────────────────────────────────────────────

  async function saveNavConfig() {
    setNavStyleSaving(true)
    try {
      const res = await fetch("/api/nav-config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config: navConfig }),
      })
      if (!res.ok) { toast.error("Failed to save nav style"); return }
      toast.success("Nav style saved")
      setNavEditorOpen(false)
    } catch { toast.error("Failed to save nav style") }
    finally { setNavStyleSaving(false) }
  }

  // ── Page CRUD ─────────────────────────────────────────────────────────────

  function handleTitleChange(val: string) { setNewTitle(val); setNewSlug(slugify(val)) }

  async function handleCreate() {
    if (!newTitle.trim() || !newSlug.trim()) return
    setCreating(true)
    try {
      const res = await fetch("/api/pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle.trim(), slug: newSlug.trim() }),
      })
      if (!res.ok) { const e = await res.json(); toast.error(e.error || "Failed"); return }
      const page = await res.json()
      setShowNew(false); setNewTitle(""); setNewSlug("")
      router.push(`/mychurch/pages/${page.slug}`)
    } catch { toast.error("Failed to create page") }
    finally { setCreating(false) }
  }

  async function handleDelete(page: PageInfo) {
    if (!confirm(`Delete "${page.title}"? This cannot be undone.`)) return
    setDeletingId(page.id)
    try {
      const res = await fetch(`/api/pages/${page.slug}`, { method: "DELETE" })
      if (!res.ok) { toast.error("Failed to delete page"); return }
      const isSys = SYSTEM_PAGES.some(s => s.slug === page.slug)
      setPages(prev => isSys
        ? prev.map(p => p.id === page.id ? { ...p, id: `__system_${p.slug}`, published: false, metaTitle: null, metaDescription: null, updatedBy: null } : p)
        : prev.filter(p => p.id !== page.id)
      )
      applyAndSave(removeFromTree(navTree, page.slug))
      toast.success("Page deleted")
    } catch { toast.error("Failed to delete page") }
    finally { setDeletingId(null) }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  function isSystemPage(slug: string) { return SYSTEM_PAGES.some(s => s.slug === slug) }
  function isPlaceholder(page: PageInfo) { return page.id.startsWith("__system_") }

  function rowStyle(id: string): React.CSSProperties {
    if (!dropInfo || dropInfo.targetId !== id) return {}
    if (dropInfo.zone === "before") return { borderTop: "2px solid #3b82f6" }
    if (dropInfo.zone === "after") return { borderBottom: "2px solid #3b82f6" }
    return {}
  }

  function rowCls(id: string, base = "") {
    if (!dropInfo || dropInfo.targetId !== id) return base
    if (dropInfo.zone === "into") return `${base} bg-blue-50 outline outline-2 outline-blue-400`
    return base
  }

  function HomeBadge({ slug }: { slug: string }) {
    if (slug !== homeSlug) return null
    return <span title="Home page"><Home className="h-3.5 w-3.5 text-green-600 shrink-0" /></span>
  }

  function statusLabel(page: PageInfo) {
    return page.published ? "Live" : isPlaceholder(page) ? "No content" : "Draft"
  }

  function UpdatedCell({ page }: { page: PageInfo }) {
    if (isPlaceholder(page)) return <span className="text-muted-foreground">—</span>
    const date = new Date(page.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    return (
      <div className="space-y-0.5">
        {page.updatedBy && <p className="text-xs font-medium truncate max-w-[140px]">{page.updatedBy}</p>}
        <p className="text-xs text-muted-foreground">{date}</p>
      </div>
    )
  }

  function SettingsBtn({ page }: { page: PageInfo }) {
    return (
      <button type="button" title="Page settings"
        onClick={e => { e.stopPropagation(); openSettings(page) }}
        className="text-muted-foreground hover:text-foreground transition-colors">
        <Cog className="h-3.5 w-3.5" />
      </button>
    )
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Pages</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Manage pages and site navigation</p>
        </div>
        <Button variant="outline" onClick={() => setNavEditorOpen(true)}>Nav Style</Button>
      </div>

      <div className="border rounded-xl overflow-hidden bg-card">
        <table className="w-full text-sm" onDragEnd={onDragEnd}>
          <thead className="bg-muted/50 border-b">
            <tr>
              <th className="w-7 px-2 py-3" />
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Title</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Last Updated</th>
              <th className="w-16 px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y">

            {/* ── Navigation header ── */}
            <tr className="bg-muted/50/80">
              <td colSpan={5} className="px-4 py-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Navigation</span>

                  {/* + dropdown menu */}
                  <div ref={addMenuRef} className="relative">
                    <button type="button" onClick={() => setAddMenuOpen(v => !v)}
                      className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors px-1.5 py-0.5 rounded hover:bg-accent">
                      <Plus className="h-3 w-3" />
                    </button>
                    {addMenuOpen && (
                      <div className="absolute right-0 top-full mt-1 bg-card border rounded-lg shadow-lg py-1 min-w-[148px] z-30">
                        <button type="button"
                          onClick={() => { setShowNew(true); setAddMenuOpen(false) }}
                          className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-accent/50 transition-colors text-left text-sm">
                          <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" /> New Page
                        </button>
                        <button type="button"
                          onClick={() => { addDropdown(); setAddMenuOpen(false) }}
                          className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-accent/50 transition-colors text-left text-sm">
                          <Menu className="h-3.5 w-3.5 text-muted-foreground shrink-0" /> Dropdown
                        </button>
                        <button type="button"
                          onClick={() => { addLink(); setAddMenuOpen(false) }}
                          className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-accent/50 transition-colors text-left text-sm">
                          <Link2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" /> Link
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </td>
            </tr>

            {navTree.length === 0 && (
              <tr
                onDragOver={e => e.preventDefault()}
                onDrop={e => {
                  e.preventDefault()
                  const src = dragId.current
                  if (src && dragSource.current === "unlinked") {
                    applyAndSave([...navTree, { id: src, type: "page", children: [] }])
                    onDragEnd()
                  }
                }}
              >
                <td colSpan={5} className="px-4 py-6 text-sm text-muted-foreground text-center">
                  No pages in navigation — drag pages here
                </td>
              </tr>
            )}

            {navTree.map(item => {

              // ── Dropdown (folder) row ──────────────────────────────────────
              if (item.type === "folder") {
                return (
                  <>
                    <tr key={item.id} draggable
                      onDragStart={() => startDrag(item.id, "nav")}
                      onDragOver={e => onRowDragOver(e, item.id)}
                      onDrop={e => onRowDrop(e, item.id)}
                      style={rowStyle(item.id)}
                      className={rowCls(item.id, "hover:bg-accent/50 transition-colors group")}
                    >
                      <td className="px-2 py-3 text-center" onClick={e => e.stopPropagation()}>
                        <GripVertical className="h-4 w-4 text-gray-300 cursor-grab active:cursor-grabbing mx-auto" />
                      </td>
                      <td className="px-4 py-3" colSpan={2}>
                        <div className="flex items-center gap-2">
                          <Menu className="h-4 w-4 text-amber-500 shrink-0" />
                          {editingDropdownId === item.id ? (
                            <div className="flex items-center gap-1">
                              <Input value={editingDropdownLabel}
                                onChange={e => setEditingDropdownLabel(e.target.value)}
                                onKeyDown={e => { if (e.key === "Enter") commitDropdownLabel(item.id); if (e.key === "Escape") setEditingDropdownId(null) }}
                                className="h-6 text-xs w-32" autoFocus />
                              <button type="button" onClick={() => commitDropdownLabel(item.id)} className="text-primary">
                                <Check className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ) : (
                            <span className="font-medium">{item.label ?? "Dropdown"}</span>
                          )}
                          <button type="button" title="Rename"
                            onClick={() => { setEditingDropdownId(item.id); setEditingDropdownLabel(item.label ?? "") }}
                            className="text-gray-300 hover:text-gray-600 transition-colors">
                            <Pencil className="h-3 w-3" />
                          </button>
                          <span className="text-xs text-muted-foreground">
                            {(item.children ?? []).length === 0 ? "empty" : `${(item.children ?? []).length} page${(item.children ?? []).length !== 1 ? "s" : ""}`}
                          </span>
                        </div>
                      </td>
                      <td className="hidden md:table-cell" />
                      <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                          <button type="button" onClick={() => removeFromNav(item.id)}
                            className="text-muted-foreground hover:text-destructive transition-colors">
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>

                    {(item.children ?? []).map(slug => {
                      const page = pages.find(p => p.slug === slug)
                      if (!page) return null
                      return (
                        <tr key={`${item.id}:${slug}`} draggable
                          onDragStart={() => startDrag(slug, "nav")}
                          onDragOver={e => onRowDragOver(e, `child:${slug}`, true)}
                          onDrop={e => onRowDrop(e, `child:${slug}`, true)}
                          style={rowStyle(`child:${slug}`)}
                          className={rowCls(`child:${slug}`, "hover:bg-accent/50/60 bg-muted/50/30 cursor-pointer group")}
                          onClick={() => router.push(`/mychurch/pages/${slug}`)}
                        >
                          <td className="px-2 py-2.5 text-center" onClick={e => e.stopPropagation()}>
                            <GripVertical className="h-3.5 w-3.5 text-gray-300 cursor-grab active:cursor-grabbing mx-auto" />
                          </td>
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-2 pl-4">
                              <CornerDownRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                              <span className="font-semibold">{page.title}</span>
                              <HomeBadge slug={slug} />
                            </div>
                          </td>
                          <td className="px-4 py-2.5">
                            <Badge variant={page.published ? "default" : "secondary"}>{statusLabel(page)}</Badge>
                          </td>
                          <td className="hidden md:table-cell px-4 py-2.5">
                            <UpdatedCell page={page} />
                          </td>
                          <td className="px-4 py-2.5 text-right" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <SettingsBtn page={page} />
                              <button type="button" onClick={() => removeFromNav(slug)}
                                className="text-muted-foreground hover:text-destructive transition-colors">
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </>
                )
              }

              // ── Link row ──────────────────────────────────────────────────
              if (item.type === "link") {
                return (
                  <tr key={item.id} draggable
                    onDragStart={() => startDrag(item.id, "nav")}
                    onDragOver={e => onRowDragOver(e, item.id)}
                    onDrop={e => onRowDrop(e, item.id)}
                    style={rowStyle(item.id)}
                    className={rowCls(item.id, "hover:bg-accent/50 transition-colors group")}
                  >
                    <td className="px-2 py-3 text-center" onClick={e => e.stopPropagation()}>
                      <GripVertical className="h-4 w-4 text-gray-300 cursor-grab active:cursor-grabbing mx-auto" />
                    </td>
                    <td className="px-4 py-2.5" colSpan={2}>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link2 className="h-4 w-4 text-blue-500 shrink-0" />
                        {editingLinkId === item.id ? (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <Input value={editingLinkLabel}
                              onChange={e => setEditingLinkLabel(e.target.value)}
                              onKeyDown={e => { if (e.key === "Enter") commitLink(item.id); if (e.key === "Escape") setEditingLinkId(null) }}
                              className="h-6 text-xs w-28" placeholder="Label" autoFocus />
                            <Input value={editingLinkHref}
                              onChange={e => setEditingLinkHref(e.target.value)}
                              onKeyDown={e => { if (e.key === "Enter") commitLink(item.id); if (e.key === "Escape") setEditingLinkId(null) }}
                              className="h-6 text-xs w-44" placeholder="https://…" />
                            <button type="button" onClick={() => commitLink(item.id)} className="text-primary">
                              <Check className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ) : (
                          <>
                            <span className="font-medium">{item.label ?? "Link"}</span>
                            <code className="text-xs bg-muted px-1.5 py-0.5 rounded text-muted-foreground">{item.href}</code>
                          </>
                        )}
                        <button type="button" title="Edit"
                          onClick={() => { setEditingLinkId(item.id); setEditingLinkLabel(item.label ?? ""); setEditingLinkHref(item.href ?? "") }}
                          className="text-gray-300 hover:text-gray-600 transition-colors">
                          <Pencil className="h-3 w-3" />
                        </button>
                      </div>
                    </td>
                    <td className="hidden md:table-cell" />
                    <td className="px-4 py-2.5 text-right" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                        <button type="button" onClick={() => removeFromNav(item.id)}
                          className="text-muted-foreground hover:text-destructive transition-colors">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              }

              // ── Top-level page row ─────────────────────────────────────────
              const page = pages.find(p => p.slug === item.id)
              const children = item.children ?? []

              return (
                <>
                  <tr key={item.id} draggable
                    onDragStart={() => startDrag(item.id, "nav")}
                    onDragOver={e => onRowDragOver(e, item.id)}
                    onDrop={e => onRowDrop(e, item.id)}
                    style={rowStyle(item.id)}
                    className={rowCls(item.id, "hover:bg-accent/50 transition-colors cursor-pointer group")}
                    onClick={() => router.push(`/mychurch/pages/${item.id}`)}
                  >
                    <td className="px-2 py-3 text-center" onClick={e => e.stopPropagation()}>
                      <GripVertical className="h-4 w-4 text-gray-300 cursor-grab active:cursor-grabbing mx-auto" />
                    </td>
                    <td className="px-4 py-3 font-medium">
                      <div className="flex items-center gap-2">
                        {item.label ?? page?.title ?? item.id}
                        <HomeBadge slug={item.id} />
                        {children.length > 0 && (
                          <span className="text-xs text-muted-foreground font-normal">{children.length} sub</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={page?.published ? "default" : "secondary"}>
                        {page?.published ? "Live" : page && !isPlaceholder(page) ? "Draft" : "No content"}
                      </Badge>
                    </td>
                    <td className="hidden md:table-cell px-4 py-3">
                      {page ? <UpdatedCell page={page} /> : <span className="text-muted-foreground text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {page && <SettingsBtn page={page} />}
                        <button type="button" onClick={() => removeFromNav(item.id)}
                          className="text-muted-foreground hover:text-destructive transition-colors">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>

                  {children.map(slug => {
                    const child = pages.find(p => p.slug === slug)
                    if (!child) return null
                    return (
                      <tr key={`${item.id}:${slug}`} draggable
                        onDragStart={() => startDrag(slug, "nav")}
                        onDragOver={e => onRowDragOver(e, `child:${slug}`, true)}
                        onDrop={e => onRowDrop(e, `child:${slug}`, true)}
                        style={rowStyle(`child:${slug}`)}
                        className={rowCls(`child:${slug}`, "hover:bg-accent/50/60 bg-muted/50/30 cursor-pointer group")}
                        onClick={() => router.push(`/mychurch/pages/${slug}`)}
                      >
                        <td className="px-2 py-2.5 text-center" onClick={e => e.stopPropagation()}>
                          <GripVertical className="h-3.5 w-3.5 text-gray-300 cursor-grab active:cursor-grabbing mx-auto" />
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2 pl-4">
                            <CornerDownRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <span className="font-semibold">{child.title}</span>
                            <HomeBadge slug={slug} />
                          </div>
                        </td>
                        <td className="px-4 py-2.5">
                          <Badge variant={child.published ? "default" : "secondary"}>{statusLabel(child)}</Badge>
                        </td>
                        <td className="hidden md:table-cell px-4 py-2.5">
                          <UpdatedCell page={child} />
                        </td>
                        <td className="px-4 py-2.5 text-right" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <SettingsBtn page={child} />
                            <button type="button" onClick={() => removeFromNav(slug)}
                              className="text-muted-foreground hover:text-destructive transition-colors">
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </>
              )
            })}

            {/* ── Not in Navigation header ── */}
            <tr
              className={`transition-colors ${hoveringUnlinked ? "bg-red-50" : "bg-muted/50/80"}`}
              onDragOver={onUnlinkedDragOver}
              onDragLeave={() => setHoveringUnlinked(false)}
              onDrop={onUnlinkedDrop}
            >
              <td colSpan={5} className="px-4 py-1.5">
                <span className={`text-[11px] font-semibold uppercase tracking-wider ${hoveringUnlinked ? "text-red-500" : "text-muted-foreground"}`}>
                  {hoveringUnlinked ? "Drop to remove from navigation" : "Not in Navigation"}
                </span>
              </td>
            </tr>

            {unlinked.length === 0 ? (
              <tr onDragOver={onUnlinkedDragOver} onDragLeave={() => setHoveringUnlinked(false)} onDrop={onUnlinkedDrop}
                className={`transition-colors ${hoveringUnlinked ? "bg-red-50" : ""}`}>
                <td colSpan={5} className="px-4 py-4 text-sm text-muted-foreground text-center">All pages are in the navigation</td>
              </tr>
            ) : unlinked.map(page => (
              <tr key={page.id} draggable
                onDragStart={() => startDrag(page.slug, "unlinked")}
                onDragOver={onUnlinkedDragOver}
                onDragLeave={() => setHoveringUnlinked(false)}
                onDrop={onUnlinkedDrop}
                className={`hover:bg-accent/50 transition-colors text-muted-foreground cursor-pointer group ${hoveringUnlinked ? "bg-red-50" : ""}`}
                onClick={() => !isPlaceholder(page) && router.push(`/mychurch/pages/${page.slug}`)}
              >
                <td className="px-2 py-3 text-center" onClick={e => e.stopPropagation()}>
                  <GripVertical className="h-4 w-4 text-gray-300 cursor-grab active:cursor-grabbing mx-auto" />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {page.title}
                    <HomeBadge slug={page.slug} />
                  </div>
                </td>
                <td className="px-4 py-3">
                  <Badge variant={page.published ? "default" : "secondary"}>{statusLabel(page)}</Badge>
                </td>
                <td className="hidden md:table-cell px-4 py-3">
                  <UpdatedCell page={page} />
                </td>
                <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <SettingsBtn page={page} />
                    <button type="button"
                      disabled={deletingId === page.id}
                      onClick={() => handleDelete(page)}
                      className="text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Page Settings Dialog ── */}
      {settingsForm && (
        <Dialog open onOpenChange={open => { if (!open) setSettingsForm(null) }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Page Settings — {settingsForm.page.title}</DialogTitle>
            </DialogHeader>

            <div className="space-y-5 py-1">
              {/* Slug */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">URL Slug</Label>
                {isSystemPage(settingsForm.page.slug) ? (
                  <div className="flex items-center gap-1.5">
                    <span className="text-muted-foreground text-sm">/</span>
                    <Input value={settingsForm.slug} disabled className="bg-muted/50 text-muted-foreground" />
                  </div>
                ) : (
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-muted-foreground text-sm">/</span>
                      <Input
                        value={settingsForm.slug}
                        onChange={e => setSettingsForm(f => f ? { ...f, slug: slugify(e.target.value) } : f)}
                        placeholder="page-slug"
                      />
                    </div>
                    {settingsForm.slug !== settingsForm.page.slug && (
                      <p className="text-xs text-amber-600">Changing the slug will update the page URL.</p>
                    )}
                  </div>
                )}
              </div>

              <Separator />

              {/* Homepage */}
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium">Set as Home Page</p>
                  <p className="text-xs text-muted-foreground mt-0.5">This page will render at the root URL <code className="bg-muted px-1 rounded">/</code></p>
                </div>
                <button
                  type="button"
                  onClick={() => setSettingsForm(f => f ? { ...f, isHome: !f.isHome } : f)}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none ${settingsForm.isHome ? "bg-primary" : "bg-input"}`}
                  role="switch"
                  aria-checked={settingsForm.isHome}
                >
                  <span className={`pointer-events-none block h-4 w-4 rounded-full bg-card shadow-lg ring-0 transition-transform ${settingsForm.isHome ? "translate-x-4" : "translate-x-0"}`} />
                </button>
              </div>

              <Separator />

              {/* SEO */}
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">SEO</p>
                <div className="space-y-1.5">
                  <Label htmlFor="meta-title" className="text-sm">Meta Title</Label>
                  <Input
                    id="meta-title"
                    placeholder={settingsForm.page.title}
                    value={settingsForm.metaTitle}
                    onChange={e => setSettingsForm(f => f ? { ...f, metaTitle: e.target.value } : f)}
                  />
                  <p className="text-xs text-muted-foreground">Overrides the page title in search results.</p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="meta-desc" className="text-sm">Meta Description</Label>
                  <Textarea
                    id="meta-desc"
                    placeholder="A brief description of this page for search engines..."
                    value={settingsForm.metaDescription}
                    onChange={e => setSettingsForm(f => f ? { ...f, metaDescription: e.target.value } : f)}
                    rows={3}
                    className="resize-none"
                  />
                  <p className="text-xs text-muted-foreground">{settingsForm.metaDescription.length}/160 characters recommended</p>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setSettingsForm(null)}>Cancel</Button>
              <Button onClick={saveSettings} disabled={settingsSaving}>
                {settingsSaving ? "Saving…" : "Save"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* ── New Page Dialog ── */}
      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Page</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="page-title">Title</Label>
              <Input id="page-title" placeholder="About Us" value={newTitle} onChange={e => handleTitleChange(e.target.value)} autoFocus />
            </div>
            <div className="space-y-2">
              <Label htmlFor="page-slug">Slug</Label>
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground text-sm">/</span>
                <Input id="page-slug" placeholder="about-us" value={newSlug} onChange={e => setNewSlug(slugify(e.target.value))} />
              </div>
              <p className="text-xs text-muted-foreground">URL: /{newSlug || "your-slug"}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNew(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={creating || !newTitle.trim() || !newSlug.trim()}>
              {creating ? "Creating..." : "Create Page"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Nav Editor ── */}
      <NavEditor
        open={navEditorOpen}
        onClose={() => setNavEditorOpen(false)}
        config={navConfig}
        onChange={setNavConfig}
        onSave={saveNavConfig}
        saving={navStyleSaving}
      />
    </div>
  )
}
