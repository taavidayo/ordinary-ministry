"use client"

import { useState, useRef, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { MapPin, Loader2 } from "lucide-react"

interface NominatimResult {
  place_id: number
  display_name: string
  name: string
}

interface Props {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export default function LocationSearch({ value, onChange, placeholder = "Search for a location…" }: Props) {
  const [query, setQuery] = useState(value)
  const [results, setResults] = useState<NominatimResult[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Sync external value changes
  useEffect(() => { setQuery(value) }, [value])

  // Close on outside click
  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", onMouseDown)
    return () => document.removeEventListener("mousedown", onMouseDown)
  }, [])

  function handleChange(q: string) {
    setQuery(q)
    onChange(q)
    setOpen(false)

    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (q.trim().length < 3) { setResults([]); return }

    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=6`,
          { headers: { "Accept-Language": "en" } }
        )
        const data: NominatimResult[] = await res.json()
        setResults(data)
        setOpen(data.length > 0)
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 400)
  }

  function select(result: NominatimResult) {
    // Use a short readable name: trim the display_name to the first two segments
    const parts = result.display_name.split(",").slice(0, 3).map((s) => s.trim())
    const short = parts.join(", ")
    setQuery(short)
    onChange(short)
    setResults([])
    setOpen(false)
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          placeholder={placeholder}
          className="pl-8 pr-8"
        />
        {loading && (
          <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />
        )}
      </div>

      {open && results.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full bg-card border rounded-lg shadow-lg max-h-56 overflow-y-auto text-sm">
          {results.map((r) => (
            <li
              key={r.place_id}
              className="flex items-start gap-2 px-3 py-2 cursor-pointer hover:bg-muted"
              onMouseDown={(e) => { e.preventDefault(); select(r) }}
            >
              <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground" />
              <span className="leading-snug">{r.display_name}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
