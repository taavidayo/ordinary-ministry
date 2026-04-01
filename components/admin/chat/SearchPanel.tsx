"use client"

import { useState, useRef } from "react"
import { X, Search, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { MessageWithMeta, CustomEmojiItem } from "@/types/chat"

interface Props {
  channelId: string
  customEmojis: CustomEmojiItem[]
  onClose: () => void
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleDateString(undefined, {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  })
}

function highlight(text: string, query: string) {
  if (!query) return text
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return text
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-yellow-200 text-yellow-900 rounded px-0.5">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  )
}

export default function SearchPanel({ channelId, customEmojis, onClose }: Props) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<MessageWithMeta[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function handleChange(value: string) {
    setQuery(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!value.trim()) { setResults([]); setSearched(false); return }
    debounceRef.current = setTimeout(() => runSearch(value), 400)
  }

  async function runSearch(q: string) {
    setLoading(true)
    try {
      const res = await fetch(`/api/channels/${channelId}/search?q=${encodeURIComponent(q)}`)
      const data = await res.json()
      setResults(data)
    } catch {
      setResults([])
    } finally {
      setLoading(false)
      setSearched(true)
    }
  }

  return (
    <div className="w-80 border-l bg-card flex flex-col">
      <div className="p-3 border-b flex items-center gap-2 shrink-0">
        <Search className="h-4 w-4 text-muted-foreground shrink-0" />
        <Input
          autoFocus
          placeholder="Search messages..."
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          className="h-7 text-sm border-0 shadow-none focus-visible:ring-0 px-0"
        />
        {loading && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground shrink-0" />}
        <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {!query && (
          <p className="text-xs text-muted-foreground p-4 text-center">Type to search messages in this channel</p>
        )}
        {searched && results.length === 0 && query && (
          <p className="text-sm text-muted-foreground p-4 text-center">No messages found for &ldquo;{query}&rdquo;</p>
        )}
        <div className="divide-y">
          {results.map((msg) => (
            <div key={msg.id} className="p-3 hover:bg-accent/50">
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-xs font-semibold">{msg.author.name}</span>
                <span className="text-xs text-muted-foreground">{formatTime(msg.createdAt)}</span>
              </div>
              <p className="text-sm leading-snug text-foreground">
                {highlight(msg.content, query)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
