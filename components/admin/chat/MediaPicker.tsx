"use client"

import { useState, ReactNode, useEffect, useRef } from "react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import type { CustomEmojiItem } from "@/types/chat"

const GIPHY_KEY = process.env.NEXT_PUBLIC_GIPHY_API_KEY ?? ""

const COMMON_EMOJIS = [
  "😀","😂","🥹","😊","😎","🤔","😅","😭","😍","🥰",
  "👍","👎","🙌","👏","🤝","🫶","❤️","🔥","✨","🎉",
  "🙏","💯","⚡","🌟","💪","😤","🤦","🤷","💀","👀",
  "😬","😮","😯","🫡","🫠","😶","🤐","😑","🙄","😏",
  "🎶","📌","📎","🔗","✅","❌","⚠️","💡","📣","🔔",
  "🕐","📅","🗓️","📝","📋","📊","🗂️","💬","📧","📞",
]

interface GifResult {
  id: string
  url: string
  preview: string
}

interface Props {
  customEmojis: CustomEmojiItem[]
  onSelect: (value: string) => void
  children: ReactNode
}

export default function MediaPicker({ customEmojis, onSelect, children }: Props) {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<"emoji" | "gif">("emoji")
  const [search, setSearch] = useState("")
  const [gifs, setGifs] = useState<GifResult[]>([])
  const [gifLoading, setGifLoading] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Fetch GIFs when search changes (debounced)
  useEffect(() => {
    if (tab !== "gif") return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      fetchGifs(search || "trending")
    }, 400)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [search, tab])

  // Load trending on GIF tab open
  useEffect(() => {
    if (tab === "gif" && gifs.length === 0) fetchGifs("trending")
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab])

  async function fetchGifs(query: string) {
    if (!GIPHY_KEY) return
    setGifLoading(true)
    try {
      const endpoint = query === "trending"
        ? `https://api.giphy.com/v1/gifs/trending?api_key=${GIPHY_KEY}&limit=20&rating=g`
        : `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_KEY}&q=${encodeURIComponent(query)}&limit=20&rating=g`
      const res = await fetch(endpoint)
      const data = await res.json()
      const results: GifResult[] = (data.data ?? []).map((r: {
        id: string
        images: {
          fixed_height: { url: string }
          fixed_height_small: { url: string; webp?: string }
        }
      }) => ({
        id: r.id,
        url: r.images.fixed_height.url,
        preview: r.images.fixed_height_small.webp ?? r.images.fixed_height_small.url,
      }))
      setGifs(results)
    } catch {
      // ignore
    }
    setGifLoading(false)
  }

  const filteredEmojis = search ? COMMON_EMOJIS.filter((e) => e.includes(search)) : COMMON_EMOJIS
  const filteredCustom = search ? customEmojis.filter((e) => e.name.includes(search)) : customEmojis

  function pick(value: string) {
    onSelect(value)
    setOpen(false)
    setSearch("")
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        {/* Tabs */}
        <div className="flex border-b">
          <button
            className={cn(
              "flex-1 text-xs py-2 font-medium transition-colors",
              tab === "emoji" ? "border-b-2 border-primary text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
            onClick={() => { setTab("emoji"); setSearch("") }}
          >
            Emoji
          </button>
          <button
            className={cn(
              "flex-1 text-xs py-2 font-medium transition-colors",
              tab === "gif" ? "border-b-2 border-primary text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
            onClick={() => { setTab("gif"); setSearch("") }}
          >
            GIF
          </button>
        </div>

        <div className="p-2">
          <Input
            placeholder={tab === "emoji" ? "Search emoji..." : "Search GIFs..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mb-2 h-7 text-sm"
          />

          {tab === "emoji" ? (
            <>
              <div className="grid grid-cols-10 gap-0.5 max-h-48 overflow-y-auto">
                {filteredEmojis.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => pick(emoji)}
                    className="h-7 w-7 flex items-center justify-center rounded hover:bg-accent text-base"
                    title={emoji}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
              {filteredCustom.length > 0 && (
                <>
                  <p className="text-xs text-muted-foreground mt-2 mb-1 font-medium">Custom</p>
                  <div className="grid grid-cols-10 gap-0.5">
                    {filteredCustom.map((e) => (
                      <button
                        key={e.id}
                        onClick={() => pick(`:${e.name}:`)}
                        className="h-7 w-7 flex items-center justify-center rounded hover:bg-accent"
                        title={`:${e.name}:`}
                      >
                        <img src={e.imageUrl} alt={e.name} className="h-5 w-5 object-contain" />
                      </button>
                    ))}
                  </div>
                </>
              )}
            </>
          ) : (
            <div className="max-h-56 overflow-y-auto">
              {!GIPHY_KEY ? (
                <p className="text-xs text-muted-foreground text-center py-4">
                  Add <code className="bg-muted px-1 rounded">NEXT_PUBLIC_GIPHY_API_KEY</code> to .env to enable GIFs
                </p>
              ) : gifLoading ? (
                <p className="text-xs text-muted-foreground text-center py-4">Loading…</p>
              ) : gifs.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">No GIFs found</p>
              ) : (
                <div className="grid grid-cols-2 gap-1">
                  {gifs.map((gif) => (
                    <button
                      key={gif.id}
                      onClick={() => pick(gif.url)}
                      className="rounded overflow-hidden hover:opacity-80 transition-opacity"
                    >
                      <img src={gif.preview} alt="gif" className="w-full h-20 object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
