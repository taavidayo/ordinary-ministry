"use client"

import { useState, ReactNode } from "react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Input } from "@/components/ui/input"
import type { CustomEmojiItem } from "@/types/chat"

const COMMON_EMOJIS = [
  "😀","😂","🥹","😊","😎","🤔","😅","😭","😍","🥰",
  "👍","👎","🙌","👏","🤝","🫶","❤️","🔥","✨","🎉",
  "🙏","💯","⚡","🌟","💪","😤","🤦","🤷","💀","👀",
  "😬","😮","😯","🫡","🫠","😶","🤐","😑","🙄","😏",
  "🎶","📌","📎","🔗","✅","❌","⚠️","💡","📣","🔔",
  "🕐","📅","🗓️","📝","📋","📊","🗂️","💬","📧","📞",
  "🍕","☕","🍺","🎂","🍔","🍦","🏆","🎯","🎮","⚽",
  "🌈","🌙","☀️","❄️","🌊","🌺","🍀","🦋","🐶","🐱",
]

interface Props {
  customEmojis: CustomEmojiItem[]
  onSelect: (emoji: string) => void
  children: ReactNode
}

export default function EmojiPickerPopover({ customEmojis, onSelect, children }: Props) {
  const [search, setSearch] = useState("")
  const [open, setOpen] = useState(false)

  const filtered = search
    ? COMMON_EMOJIS.filter((e) => e.includes(search))
    : COMMON_EMOJIS

  const filteredCustom = search
    ? customEmojis.filter((e) => e.name.includes(search))
    : customEmojis

  function pick(emoji: string) {
    onSelect(emoji)
    setOpen(false)
    setSearch("")
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-72 p-2" align="end">
        <Input
          placeholder="Search emoji..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="mb-2 h-7 text-sm"
        />
        <div className="grid grid-cols-10 gap-0.5 max-h-48 overflow-y-auto">
          {filtered.map((emoji) => (
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
      </PopoverContent>
    </Popover>
  )
}
