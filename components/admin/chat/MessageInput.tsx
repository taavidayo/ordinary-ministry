"use client"

import { useRef, useState, useEffect, KeyboardEvent } from "react"
import {
  Send, SmilePlus, Code2,
  List, Link as LinkIcon, BookOpen, Paperclip, Baseline, X, Quote,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import type { CustomEmojiItem } from "@/types/chat"
import { cn } from "@/lib/utils"
import MediaPicker from "./MediaPicker"

interface Props {
  placeholder: string
  customEmojis: CustomEmojiItem[]
  members?: { id: string; name: string }[]
  onSend: (content: string) => void
}

const COLORS = [
  { hex: "#ef4444", cls: "bg-red-500" },
  { hex: "#f97316", cls: "bg-orange-500" },
  { hex: "#ca8a04", cls: "bg-yellow-600" },
  { hex: "#16a34a", cls: "bg-green-600" },
  { hex: "#3b82f6", cls: "bg-blue-500" },
  { hex: "#a855f7", cls: "bg-purple-500" },
  { hex: "#ec4899", cls: "bg-pink-500" },
]

const BIBLE_VERSIONS = [
  { value: "ESV",  label: "ESV"  },
  { value: "NIV",  label: "NIV"  },
  { value: "NLT",  label: "NLT"  },
  { value: "NKJV", label: "NKJV" },
  { value: "NASB", label: "NASB" },
  { value: "KJV",  label: "KJV"  },
]

export default function MessageInput({ placeholder, customEmojis, members = [], onSend }: Props) {
  const editorRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const [hasContent, setHasContent] = useState(false)
  const [mentionQuery, setMentionQuery] = useState<{ query: string; start: number } | null>(null)
  const [selectedMentionIdx, setSelectedMentionIdx] = useState(0)
  const [fmt, setFmt] = useState({ bold: false, italic: false, underline: false, strike: false })

  const [showFormat, setShowFormat] = useState(false)
  const [showColorPicker, setShowColorPicker] = useState(false)

  const [showLinkForm, setShowLinkForm] = useState(false)
  const [linkText, setLinkText] = useState("")
  const [linkUrl, setLinkUrl] = useState("")

  const [showBible, setShowBible] = useState(false)
  const [bibleRef, setBibleRef] = useState("")
  const [bibleVersion, setBibleVersion] = useState("ESV")
  const [bibleResult, setBibleResult] = useState<{ text: string; reference: string } | null>(null)
  const [bibleLooking, setBibleLooking] = useState(false)
  const [bibleError, setBibleError] = useState("")

  const filteredMembers = mentionQuery
    ? members.filter((m) => m.name.toLowerCase().includes(mentionQuery.query.toLowerCase())).slice(0, 6)
    : []

  useEffect(() => { setSelectedMentionIdx(0) }, [filteredMembers.length])

  // ── Helpers ──────────────────────────────────────────────────────────────

  /** Get text before cursor in the contenteditable, then check for @query */
  function getMentionQueryCE(): { query: string; start: number } | null {
    const sel = window.getSelection()
    if (!sel?.rangeCount) return null
    const el = editorRef.current
    if (!el) return null
    const range = sel.getRangeAt(0).cloneRange()
    range.setStart(el, 0)
    const textBefore = range.toString()
    const match = textBefore.match(/(?:^|\s)@(\S*)$/)
    if (!match) return null
    return { query: match[1], start: textBefore.lastIndexOf("@") }
  }

  function updateFmt() {
    setFmt({
      bold:      document.queryCommandState("bold"),
      italic:    document.queryCommandState("italic"),
      underline: document.queryCommandState("underline"),
      strike:    document.queryCommandState("strikeThrough"),
    })
  }

  function handleInput() {
    const el = editorRef.current
    setHasContent(!!el?.innerText.trim())
    setMentionQuery(getMentionQueryCE())
    updateFmt()
  }

  /** Executes a document.execCommand while keeping focus in the editor */
  function exec(command: string, value?: string) {
    document.execCommand(command, false, value ?? "")
    handleInput()
  }

  // ── Mention ───────────────────────────────────────────────────────────────

  function insertMention(name: string) {
    if (!mentionQuery) return
    const sel = window.getSelection()
    if (!sel?.rangeCount) return
    const range = sel.getRangeAt(0)
    const container = range.startContainer
    if (container.nodeType !== Node.TEXT_NODE) { setMentionQuery(null); return }
    const text = container.textContent ?? ""
    const offset = range.startOffset
    const atIndex = text.slice(0, offset).lastIndexOf("@")
    if (atIndex === -1) { setMentionQuery(null); return }
    const delRange = document.createRange()
    delRange.setStart(container, atIndex)
    delRange.setEnd(container, offset)
    sel.removeAllRanges()
    sel.addRange(delRange)
    exec("insertHTML",
      `<span class="bg-primary/10 text-primary rounded px-1 font-medium" contenteditable="false">@${name}</span>\u00A0`)
    setMentionQuery(null)
  }

  // ── Link ──────────────────────────────────────────────────────────────────

  function insertLink() {
    if (!linkUrl.trim()) return
    const url = linkUrl.startsWith("http") ? linkUrl : `https://${linkUrl}`
    const text = linkText.trim() || url
    editorRef.current?.focus()
    exec("insertHTML", `<a href="${url}" target="_blank" rel="noopener noreferrer">${text}</a>`)
    setShowLinkForm(false); setLinkText(""); setLinkUrl("")
  }

  // ── Bible ─────────────────────────────────────────────────────────────────

  async function lookupVerse() {
    if (!bibleRef.trim()) return
    setBibleLooking(true); setBibleError(""); setBibleResult(null)
    try {
      const res = await fetch(`/api/bible?ref=${encodeURIComponent(bibleRef.trim())}&version=${bibleVersion}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Not found")
      setBibleResult({ text: data.text, reference: data.reference })
    } catch (err) {
      setBibleError(err instanceof Error ? err.message : "Verse not found. Try 'John 3:16'.")
    }
    setBibleLooking(false)
  }

  function insertVerse() {
    if (!bibleResult) return
    const version = BIBLE_VERSIONS.find((v) => v.value === bibleVersion)?.label ?? bibleVersion
    editorRef.current?.focus()
    exec("insertHTML",
      `<blockquote style="border-left:3px solid;padding-left:0.75rem;margin:0.25rem 0;opacity:0.7;font-style:italic">"${bibleResult.text}" — ${bibleResult.reference} (${version})</blockquote><br>`)
    setShowBible(false); setBibleRef(""); setBibleResult(null)
  }

  // ── File upload ───────────────────────────────────────────────────────────

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const formData = new FormData()
    formData.append("file", file)
    const res = await fetch("/api/upload", { method: "POST", body: formData })
    if (!res.ok) { toast.error("Upload failed"); return }
    const { url, name } = await res.json()
    editorRef.current?.focus()
    exec("insertHTML", `<a href="${url}" target="_blank" rel="noopener noreferrer">📎 ${name}</a>`)
    e.target.value = ""
  }

  // ── Emoji / GIF ───────────────────────────────────────────────────────────

  function insertEmoji(value: string) {
    editorRef.current?.focus()
    if (value.startsWith("http")) {
      // GIF URL — insert as image
      exec("insertHTML", `<img src="${value}" alt="gif" style="max-height:12rem;border-radius:0.25rem;display:block;margin-top:0.25rem">`)
    } else {
      // Check for custom emoji token :name:
      const match = value.match(/^:(\w[\w-]*):\s*$/)
      const emoji = match ? customEmojis.find((e) => e.name === match[1]) : null
      if (emoji) {
        exec("insertHTML", `<img src="${emoji.imageUrl}" alt="${value}" title="${value}" style="display:inline;height:1.25rem;width:1.25rem;object-fit:contain">`)
      } else {
        exec("insertText", value)
      }
    }
  }

  // ── Submit ────────────────────────────────────────────────────────────────

  function submit() {
    const el = editorRef.current
    if (!el || !el.innerText.trim()) return
    onSend(el.innerHTML)
    el.innerHTML = ""
    setHasContent(false)
    setMentionQuery(null)
  }

  // ── Keyboard ──────────────────────────────────────────────────────────────

  /** True when the cursor is inside a list item */
  function isInList(): boolean {
    const sel = window.getSelection()
    if (!sel?.rangeCount) return false
    let node: Node | null = sel.getRangeAt(0).startContainer
    while (node && node !== editorRef.current) {
      const tag = (node as Element).tagName
      if (tag === "LI" || tag === "UL" || tag === "OL") return true
      node = node.parentNode
    }
    return false
  }

  function handleKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (mentionQuery && filteredMembers.length > 0) {
      if (e.key === "ArrowDown") { e.preventDefault(); setSelectedMentionIdx((i) => (i + 1) % filteredMembers.length); return }
      if (e.key === "ArrowUp")   { e.preventDefault(); setSelectedMentionIdx((i) => (i - 1 + filteredMembers.length) % filteredMembers.length); return }
      if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); insertMention(filteredMembers[selectedMentionIdx].name); return }
      if (e.key === "Escape") { setMentionQuery(null); return }
    }

    if (e.key === "Enter") {
      if (isInList()) {
        if (e.shiftKey) {
          // Shift+Enter inside a list = new bullet point
          e.preventDefault()
          document.execCommand("insertParagraph")
        }
        // Plain Enter inside a list = let the browser create a new <li> naturally
        return
      }
      if (!e.shiftKey) {
        e.preventDefault()
        submit()
      }
    }
  }

  // ── Toolbar button ────────────────────────────────────────────────────────

  function FmtBtn({ title, onClick, active, children }: { title: string; onClick: () => void; active?: boolean; children: React.ReactNode }) {
    return (
      <button
        type="button"
        title={title}
        className={cn(
          "h-6 w-6 flex items-center justify-center rounded transition-colors",
          active
            ? "bg-accent text-foreground"
            : "text-muted-foreground hover:bg-accent hover:text-foreground"
        )}
        onMouseDown={(e) => { e.preventDefault(); onClick() }}
      >
        {children}
      </button>
    )
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="relative">
      {/* @mention picker */}
      {mentionQuery && filteredMembers.length > 0 && (
        <div className="absolute bottom-full left-0 mb-1 w-56 bg-card border rounded-lg shadow-lg z-30 overflow-hidden">
          {filteredMembers.map((m, i) => (
            <button
              key={m.id}
              className={cn("w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-accent/50", i === selectedMentionIdx && "bg-primary/10")}
              onMouseDown={(e) => { e.preventDefault(); insertMention(m.name) }}
            >
              <div className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium shrink-0">
                {m.name[0].toUpperCase()}
              </div>
              <span>@{m.name}</span>
            </button>
          ))}
        </div>
      )}

      {/* Formatting toolbar (toggleable) */}
      {showFormat && (
        <div className="mb-1.5 flex flex-col gap-1">
          {showLinkForm && (
            <div className="flex gap-1.5 items-center p-2 border rounded-lg bg-muted/40">
              <input className="flex-1 h-7 px-2 text-sm border rounded bg-background focus:outline-none" placeholder="Link text" value={linkText} onChange={(e) => setLinkText(e.target.value)} autoFocus />
              <input className="flex-1 h-7 px-2 text-sm border rounded bg-background focus:outline-none" placeholder="https://..." value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} onKeyDown={(e) => e.key === "Enter" && insertLink()} />
              <button type="button" className="h-7 px-2 text-xs rounded bg-primary text-primary-foreground" onClick={insertLink}>Insert</button>
              <button type="button" className="h-7 w-7 flex items-center justify-center rounded hover:bg-accent" onClick={() => setShowLinkForm(false)}><X className="h-3.5 w-3.5" /></button>
            </div>
          )}

          {showBible && (
            <div className="flex flex-col gap-1.5 p-2 border rounded-lg bg-muted/40">
              <div className="flex gap-1.5 items-center">
                <input className="flex-1 h-7 px-2 text-sm border rounded bg-background focus:outline-none" placeholder="e.g. John 3:16" value={bibleRef} onChange={(e) => setBibleRef(e.target.value)} onKeyDown={(e) => e.key === "Enter" && lookupVerse()} autoFocus />
                <select className="h-7 px-1.5 text-sm border rounded bg-background focus:outline-none" value={bibleVersion} onChange={(e) => setBibleVersion(e.target.value)}>
                  {BIBLE_VERSIONS.map((v) => <option key={v.value} value={v.value}>{v.label}</option>)}
                </select>
                <button type="button" className="h-7 px-2 text-xs rounded bg-primary text-primary-foreground" onClick={lookupVerse} disabled={bibleLooking}>{bibleLooking ? "…" : "Look up"}</button>
                <button type="button" className="h-7 w-7 flex items-center justify-center rounded hover:bg-accent" onClick={() => setShowBible(false)}><X className="h-3.5 w-3.5" /></button>
              </div>
              {bibleError && <p className="text-xs text-destructive">{bibleError}</p>}
              {bibleResult && (
                <div className="text-xs text-muted-foreground border rounded p-2 bg-background space-y-1">
                  <p className="font-medium text-foreground">{bibleResult.reference}</p>
                  <p className="leading-relaxed">{bibleResult.text}</p>
                  <button type="button" className="mt-1 h-6 px-2 text-xs rounded bg-primary text-primary-foreground" onClick={insertVerse}>Insert</button>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center gap-0.5 px-1">
            <FmtBtn title="Bold" active={fmt.bold} onClick={() => exec("bold")}>
              <span className="font-bold text-[13px] leading-none font-sans select-none">B</span>
            </FmtBtn>
            <FmtBtn title="Italic" active={fmt.italic} onClick={() => exec("italic")}>
              <span className="italic text-[13px] leading-none font-sans select-none">I</span>
            </FmtBtn>
            <FmtBtn title="Underline" active={fmt.underline} onClick={() => exec("underline")}>
              <span className="underline text-[13px] leading-none font-sans select-none">U</span>
            </FmtBtn>
            <FmtBtn title="Strikethrough" active={fmt.strike} onClick={() => exec("strikeThrough")}>
              <span className="line-through text-[13px] leading-none font-sans select-none">S</span>
            </FmtBtn>

            <div className="relative">
              <FmtBtn title="Text color" onClick={() => setShowColorPicker((v) => !v)}>
                <span className="text-[13px] leading-none font-sans select-none" style={{ borderBottom: "2px solid currentColor", paddingBottom: "1px" }}>A</span>
              </FmtBtn>
              {showColorPicker && (
                <div className="absolute bottom-full left-0 mb-1 flex gap-1 p-1.5 bg-card border rounded-lg shadow-lg z-40">
                  {COLORS.map((c) => (
                    <button key={c.hex} type="button"
                      className={cn("h-5 w-5 rounded-full border-2 border-transparent hover:border-foreground/30", c.cls)}
                      onMouseDown={(e) => { e.preventDefault(); exec("foreColor", c.hex); setShowColorPicker(false) }}
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="h-4 w-px bg-border mx-1" />

            <FmtBtn title="Bulleted list" onClick={() => exec("insertUnorderedList")}><List className="h-3.5 w-3.5" /></FmtBtn>
            <FmtBtn title="Insert link" onClick={() => { setShowLinkForm((v) => !v); setShowBible(false) }}>
              <LinkIcon className="h-3.5 w-3.5" />
            </FmtBtn>
            <FmtBtn title="Quote" onClick={() => {
              editorRef.current?.focus()
              exec("insertHTML", '<blockquote style="border-left:3px solid;padding-left:0.75rem;margin:0.25rem 0;opacity:0.7;font-style:italic">Quote</blockquote><br>')
            }}>
              <Quote className="h-3.5 w-3.5" />
            </FmtBtn>

            <div className="h-4 w-px bg-border mx-1" />

            <FmtBtn title="Inline code" onClick={() => {
              const sel = window.getSelection()
              const text = sel?.toString() || "code"
              exec("insertHTML", `<code style="background:var(--muted);padding:0 4px;border-radius:3px;font-family:monospace;font-size:0.85em">${text}</code>`)
            }}><Code2 className="h-3.5 w-3.5" /></FmtBtn>
            <FmtBtn title="Bible verse" onClick={() => { setShowBible((v) => !v); setShowLinkForm(false) }}>
              <BookOpen className="h-3.5 w-3.5" />
            </FmtBtn>
          </div>
        </div>
      )}

      <div className="flex items-end gap-2">
        <div className="flex-1 border rounded-lg flex items-end overflow-hidden bg-card">
          {/* WYSIWYG contenteditable input */}
          <div className="relative flex-1 min-w-0">
            {!hasContent && (
              <div className="absolute top-0 left-0 px-3 py-2 text-sm text-muted-foreground pointer-events-none select-none">
                {placeholder}
              </div>
            )}
            <div
              ref={editorRef}
              contentEditable
              suppressContentEditableWarning
              onInput={handleInput}
              onKeyUp={updateFmt}
              onMouseUp={updateFmt}
              onKeyDown={handleKeyDown}
              className="w-full px-3 py-2 text-sm focus:outline-none leading-relaxed min-h-[36px] max-h-[200px] overflow-y-auto [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_a]:text-primary [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:pl-3 [&_blockquote]:opacity-70 [&_blockquote]:italic"
            />
          </div>

          <MediaPicker customEmojis={customEmojis} onSelect={insertEmoji}>
            <Button variant="ghost" size="icon" className="h-8 w-8 mb-1 shrink-0">
              <SmilePlus className="h-4 w-4" />
            </Button>
          </MediaPicker>
          <input ref={fileRef} type="file" className="hidden" onChange={handleFileChange} />
          <Button variant="ghost" size="icon" className="h-8 w-8 mb-1 shrink-0" title="Attach file" onClick={() => fileRef.current?.click()}>
            <Paperclip className="h-4 w-4" />
          </Button>
          <Button
            variant={showFormat ? "secondary" : "ghost"}
            size="icon"
            className="h-8 w-8 mb-1 mr-1 shrink-0"
            title="Formatting"
            onMouseDown={(e) => { e.preventDefault(); setShowFormat((v) => !v) }}
          >
            <Baseline className="h-4 w-4" />
          </Button>
        </div>
        <Button size="icon" className="h-9 w-9 shrink-0" onClick={submit}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
