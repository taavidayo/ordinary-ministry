"use client"

import React, { useRef, useState, useEffect } from "react"
import { Code2, List, Link as LinkIcon, BookOpen, Paperclip, Quote, X } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface Props {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  minRows?: number
  className?: string
  showFileUpload?: boolean
}

const COLOR_DOTS = [
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

export default function RichTextarea({ value, onChange, placeholder, minRows = 3, className, showFileUpload }: Props) {
  const editorRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const skipSync = useRef(false)
  const [isEmpty, setIsEmpty] = useState(true)
  const [fmt, setFmt] = useState({ bold: false, italic: false, underline: false, strike: false })
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

  // Sync external value into the editor (e.g., clear after save or load existing content)
  useEffect(() => {
    const el = editorRef.current
    if (!el || skipSync.current) return
    if (el.innerHTML !== value) {
      el.innerHTML = value
      setIsEmpty(!el.innerText.trim())
    }
  }, [value])

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
    if (!el) return
    skipSync.current = true
    onChange(el.innerHTML)
    setIsEmpty(!el.innerText.trim())
    updateFmt()
    requestAnimationFrame(() => { skipSync.current = false })
  }

  /** Run a document.execCommand without losing selection */
  function exec(command: string, val?: string) {
    document.execCommand(command, false, val ?? "")
    handleInput()
  }

  function insertLink() {
    if (!linkUrl.trim()) return
    const url = linkUrl.startsWith("http") ? linkUrl : `https://${linkUrl}`
    const text = linkText.trim() || url
    editorRef.current?.focus()
    exec("insertHTML", `<a href="${url}" target="_blank" rel="noopener noreferrer">${text}</a>`)
    setShowLinkForm(false); setLinkText(""); setLinkUrl("")
  }

  async function lookupVerse() {
    if (!bibleRef.trim()) return
    setBibleLooking(true); setBibleError(""); setBibleResult(null)
    try {
      const res = await fetch(`/api/bible?ref=${encodeURIComponent(bibleRef.trim())}&version=${bibleVersion}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Not found")
      setBibleResult({ text: data.text, reference: data.reference })
    } catch (err) {
      setBibleError(err instanceof Error ? err.message : "Verse not found.")
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

  return (
    <div className="space-y-1.5">
      {/* Formatting toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 px-1 py-0.5 border rounded-md bg-muted/30">
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

        {/* Color */}
        <div className="relative">
          <FmtBtn title="Text color" onClick={() => setShowColorPicker((v) => !v)}>
            <span className="text-[13px] leading-none font-sans select-none" style={{ borderBottom: "2px solid currentColor", paddingBottom: "1px" }}>A</span>
          </FmtBtn>
          {showColorPicker && (
            <div className="absolute top-full left-0 mt-1 flex gap-1 p-1.5 bg-card border rounded-lg shadow-lg z-40">
              {COLOR_DOTS.map((c) => (
                <button key={c.hex} type="button"
                  className={cn("h-5 w-5 rounded-full border-2 border-transparent hover:border-foreground/30", c.cls)}
                  onMouseDown={(e) => { e.preventDefault(); exec("foreColor", c.hex); setShowColorPicker(false) }}
                />
              ))}
            </div>
          )}
        </div>

        <div className="h-4 w-px bg-border mx-0.5" />

        <FmtBtn title="Block quote" onClick={() => {
          editorRef.current?.focus()
          exec("insertHTML", '<blockquote style="border-left:3px solid;padding-left:0.75rem;margin:0.25rem 0;opacity:0.7;font-style:italic">Quote text</blockquote><br>')
        }}>
          <Quote className="h-3.5 w-3.5" />
        </FmtBtn>
        <FmtBtn title="Bullet list" onClick={() => exec("insertUnorderedList")}>
          <List className="h-3.5 w-3.5" />
        </FmtBtn>
        <FmtBtn title="Insert link" onClick={() => { setShowLinkForm((v) => !v); setShowBible(false) }}>
          <LinkIcon className="h-3.5 w-3.5" />
        </FmtBtn>

        <div className="h-4 w-px bg-border mx-0.5" />

        <FmtBtn title="Inline code" onClick={() => {
          const sel = window.getSelection()
          const text = sel?.toString() || "code"
          exec("insertHTML", `<code style="background:var(--muted);padding:0 4px;border-radius:3px;font-family:monospace;font-size:0.85em">${text}</code>`)
        }}>
          <Code2 className="h-3.5 w-3.5" />
        </FmtBtn>
        <FmtBtn title="Bible verse" onClick={() => { setShowBible((v) => !v); setShowLinkForm(false) }}>
          <BookOpen className="h-3.5 w-3.5" />
        </FmtBtn>

        {showFileUpload && (
          <>
            <div className="h-4 w-px bg-border mx-0.5" />
            <FmtBtn title="Attach file" onClick={() => fileRef.current?.click()}>
              <Paperclip className="h-3.5 w-3.5" />
            </FmtBtn>
            <input ref={fileRef} type="file" className="hidden" onChange={handleFileChange} />
          </>
        )}
      </div>

      {/* Link form */}
      {showLinkForm && (
        <div className="flex gap-1.5 items-center p-2 border rounded-lg bg-muted/40">
          <input className="flex-1 h-7 px-2 text-sm border rounded bg-background focus:outline-none" placeholder="Link text" value={linkText} onChange={(e) => setLinkText(e.target.value)} autoFocus />
          <input className="flex-1 h-7 px-2 text-sm border rounded bg-background focus:outline-none" placeholder="https://..." value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} onKeyDown={(e) => e.key === "Enter" && insertLink()} />
          <button type="button" className="h-7 px-2 text-xs rounded bg-primary text-primary-foreground" onClick={insertLink}>Insert</button>
          <button type="button" className="h-7 w-7 flex items-center justify-center rounded hover:bg-accent" onClick={() => setShowLinkForm(false)}><X className="h-3.5 w-3.5" /></button>
        </div>
      )}

      {/* Bible form */}
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
              <button type="button" className="mt-1 h-6 px-2 text-xs rounded bg-primary text-primary-foreground" onClick={insertVerse}>Insert as Quote</button>
            </div>
          )}
        </div>
      )}

      {/* WYSIWYG editor */}
      <div className={cn("relative border rounded-lg bg-card", className)}>
        {isEmpty && (
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
          className="w-full px-3 py-2 text-sm focus:outline-none leading-relaxed [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_a]:text-primary [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:pl-3 [&_blockquote]:opacity-70 [&_blockquote]:italic"
          style={{ minHeight: `${minRows * 1.6}em` }}
        />
      </div>
    </div>
  )
}
