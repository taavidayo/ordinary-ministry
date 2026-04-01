"use client"

import { useState, useEffect, useRef } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Link as LinkIcon, FileText, File, X } from "lucide-react"
import { cn } from "@/lib/utils"

type Mode = "url" | "page" | "file"

interface FileEntry { name: string; url: string }
interface PageEntry { slug: string; title: string }

interface Props {
  value: string
  onChange: (v: string) => void
  label?: string
}

export default function LinkPicker({ value, onChange, label }: Props) {
  const [mode, setMode] = useState<Mode>(() => {
    if (!value || value.startsWith("http") || value.startsWith("#") || value === "") return "url"
    if (value.startsWith("/uploads/")) return "file"
    return "page"
  })

  const [query, setQuery] = useState("")
  const [pages, setPages] = useState<PageEntry[]>([])
  const [files, setFiles] = useState<FileEntry[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  // Fetch pages as user types
  useEffect(() => {
    if (mode !== "page") return
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/pages?q=${encodeURIComponent(query)}&limit=8`)
        if (!res.ok) return
        const data = await res.json()
        setPages(Array.isArray(data) ? data : (data.pages ?? []))
      } catch { /* ignore */ }
    }, 200)
    return () => clearTimeout(t)
  }, [query, mode])

  // Fetch files as user types
  useEffect(() => {
    if (mode !== "file") return
    const t = setTimeout(async () => {
      try {
        const res = await fetch("/api/uploads")
        if (!res.ok) return
        const data = await res.json()
        const all: FileEntry[] = data.files ?? []
        setFiles(query ? all.filter(f => f.name.toLowerCase().includes(query.toLowerCase())) : all.slice(0, 10))
      } catch { /* ignore */ }
    }, 150)
    return () => clearTimeout(t)
  }, [query, mode])

  function selectPage(slug: string) {
    onChange(`/${slug === "home" ? "" : slug}`)
    setShowDropdown(false)
    setQuery("")
  }

  function selectFile(url: string) {
    onChange(url)
    setShowDropdown(false)
    setQuery("")
  }

  const MODES: { id: Mode; icon: React.ReactNode; label: string }[] = [
    { id: "url",  icon: <LinkIcon className="h-3 w-3" />,  label: "URL"  },
    { id: "page", icon: <FileText className="h-3 w-3" />,  label: "Page" },
    { id: "file", icon: <File className="h-3 w-3" />,      label: "File" },
  ]

  return (
    <div className="space-y-1.5">
      {label && <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</Label>}

      {/* Mode tabs */}
      <div className="flex rounded-md overflow-hidden border text-xs w-fit">
        {MODES.map(m => (
          <button key={m.id} type="button"
            onClick={() => { setMode(m.id); setQuery(""); setShowDropdown(false) }}
            className={cn(
              "flex items-center gap-1 px-2.5 py-1 transition-colors",
              mode === m.id ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-accent/50"
            )}>
            {m.icon}{m.label}
          </button>
        ))}
      </div>

      {/* URL mode — direct input */}
      {mode === "url" && (
        <div className="flex items-center gap-1 border rounded px-2 py-1">
          <LinkIcon className="h-3 w-3 text-muted-foreground shrink-0" />
          <Input
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder="https://…"
            className="border-0 h-6 p-0 text-xs focus-visible:ring-0 shadow-none"
          />
          {value && (
            <button type="button" onClick={() => onChange("")} className="text-muted-foreground hover:text-foreground shrink-0">
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      )}

      {/* Page / File mode — search */}
      {(mode === "page" || mode === "file") && (
        <div ref={containerRef} className="relative">
          <div className="flex items-center gap-1 border rounded px-2 py-1">
            {mode === "page" ? <FileText className="h-3 w-3 text-muted-foreground shrink-0" /> : <File className="h-3 w-3 text-muted-foreground shrink-0" />}
            <Input
              value={query || value}
              onChange={e => { setQuery(e.target.value); onChange(e.target.value); setShowDropdown(true) }}
              onFocus={() => setShowDropdown(true)}
              placeholder={mode === "page" ? "Search pages…" : "Search files…"}
              className="border-0 h-6 p-0 text-xs focus-visible:ring-0 shadow-none"
            />
            {(query || value) && (
              <button type="button" onClick={() => { setQuery(""); onChange(""); }} className="text-muted-foreground hover:text-foreground shrink-0">
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          {showDropdown && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-card border rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
              {mode === "page" && (
                pages.length === 0 ? (
                  <p className="px-3 py-2 text-xs text-muted-foreground">No pages found</p>
                ) : pages.map(p => (
                  <button key={p.slug} type="button"
                    onMouseDown={e => { e.preventDefault(); selectPage(p.slug) }}
                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-accent/50 text-left text-sm transition-colors">
                    <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="font-medium">{p.title}</span>
                    <span className="text-xs text-muted-foreground ml-auto">/{p.slug}</span>
                  </button>
                ))
              )}
              {mode === "file" && (
                files.length === 0 ? (
                  <p className="px-3 py-2 text-xs text-muted-foreground">No files uploaded yet</p>
                ) : files.map(f => (
                  <button key={f.url} type="button"
                    onMouseDown={e => { e.preventDefault(); selectFile(f.url) }}
                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-accent/50 text-left text-sm transition-colors">
                    <File className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="truncate text-xs">{f.name.replace(/^\d+-/, "")}</span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
