"use client"

import { useMemo, useState, useEffect, useRef } from "react"
import ChordSheetJS from "chordsheetjs"
import { cn } from "@/lib/utils"

// ── Public style interface ─────────────────────────────────────────────────────

export interface ChordProStyle {
  fontFamily: "mono" | "serif" | "sans"
  fontSize: number
  chordColor: string
  textColor: string
  sectionColor: string
  columns: 1 | 2 | 3
  marginTop: number     // inches
  marginRight: number   // inches
  marginBottom: number  // inches
  marginLeft: number    // inches
}

export const DEFAULT_STYLE: ChordProStyle = {
  fontFamily: "mono",
  fontSize: 14,  // ≈ 10.5pt at 96 dpi — standard body text for chord charts
  chordColor: "#2563eb",
  textColor: "#111827",
  sectionColor: "#111827",
  columns: 1,
  marginTop: 0.75,
  marginRight: 0.75,
  marginBottom: 0.75,
  marginLeft: 0.75,
}

const FONT_STACKS: Record<ChordProStyle["fontFamily"], string> = {
  mono:  "ui-monospace, 'Cascadia Code', 'Source Code Pro', Menlo, monospace",
  serif: "Georgia, 'Times New Roman', Times, serif",
  sans:  "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
}

// ── Tag sets ───────────────────────────────────────────────────────────────────

const SECTION_TAGS = new Set([
  "verse", "chorus", "bridge", "tag", "intro", "outro", "interlude",
  "pre-chorus", "pre_chorus", "hook", "instrumental", "vamp", "breakdown",
  "lift", "refrain", "turnaround",
  "start_of_verse", "start_of_chorus", "start_of_bridge", "start_of_tab",
  "start_of_grid", "sov", "soc", "sob", "sot",
])
const END_TAGS = new Set([
  "end_of_verse", "end_of_chorus", "end_of_bridge", "end_of_tab",
  "end_of_grid", "eov", "eoc", "eob", "eot",
])
const META_TAGS = new Set([
  "title", "t", "artist", "subtitle", "st", "composer", "lyricist",
  "key", "tempo", "time", "duration", "capo", "album", "bpm",
])
const FORMAT_ON:  Record<string, "bold" | "italic" | "underline"> = { b: "bold", i: "italic", u: "underline" }
const FORMAT_OFF: Record<string, "bold" | "italic" | "underline"> = { "/b": "bold", "/i": "italic", "/u": "underline" }

// ── Helpers ────────────────────────────────────────────────────────────────────

function sectionLabel(name: string, value: string | null | undefined): string {
  return (value || name.replace(/^start_of_/, "").replace(/_/g, " ")).toUpperCase()
}

const PLAIN_SECTION_RE =
  /^(verse|chorus|bridge|intro|outro|tag|hook|pre[-\s]?chorus|interlude|instrumental|vamp|breakdown|lift|refrain|turnaround)(\s+\d+)?[:\s]*$/i

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractMeta(lines: any[]): Record<string, string> {
  const meta: Record<string, string> = {}
  for (const line of lines) {
    for (const item of line.items) {
      if (item instanceof ChordSheetJS.Tag && item.value) {
        const n = item.name.toLowerCase()
        if (n === "title" || n === "t") meta.title = item.value
        if (n === "artist" || n === "composer" || n === "lyricist") meta.artist = item.value
        if (n === "key")  meta.key  = item.value
        if (n === "tempo" || n === "bpm") meta.tempo = item.value
        if (n === "time") meta.time = item.value
        if (n === "capo") meta.capo = item.value
      }
    }
  }
  return meta
}

/** Convert inches → % of page width (8.5 in), for CSS padding. */
function ip(inches: number) { return `${(inches / 8.5) * 100}%` }

// ── Segment splitting ──────────────────────────────────────────────────────────
// A "segment" is the content between column/page-break markers.
// Column breaks fill columns left→right; page breaks always start a new page.

interface Segment {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  lines: any[]
  pageBreakAfter: boolean
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function splitSegments(lines: any[]): Segment[] {
  const segs: Segment[] = []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let cur: any[] = []

  for (const line of lines) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const brk = line.items.find((it: any) => {
      if (!(it instanceof ChordSheetJS.Tag)) return false
      const n = it.name.toLowerCase()
      return n === "column_break" || n === "cb" || n === "new_page" || n === "np"
    })
    if (brk) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const n = (brk as any).name.toLowerCase()
      segs.push({ lines: cur, pageBreakAfter: n === "new_page" || n === "np" })
      cur = []
    } else {
      cur.push(line)
    }
  }
  segs.push({ lines: cur, pageBreakAfter: false })
  return segs
}

/**
 * Group segments into pages.
 * column_break keeps segments on the same page (rendered side-by-side as columns).
 * new_page / page_break forces a new page.
 */
function groupPages(segs: Segment[]): Segment[][] {
  const pages: Segment[][] = []
  let page: Segment[] = []
  for (const seg of segs) {
    page.push(seg)
    if (seg.pageBreakAfter) {
      pages.push(page)
      page = []
    }
  }
  if (page.length) pages.push(page)
  return pages
}

/** Returns the number of pages for a given ChordPro text (used by external consumers). */
export function getPageCount(chordproText: string, transpose = 0): number {
  try {
    const parser = new ChordSheetJS.ChordProParser()
    let song = parser.parse(chordproText)
    if (transpose !== 0) song = song.transpose(transpose)
    return groupPages(splitSegments(song.lines)).length
  } catch { return 1 }
}

// ── Column content ─────────────────────────────────────────────────────────────
// Renders one segment (list of lines). No break handling — breaks are structural.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ColumnContent({ lines, style }: { lines: any[]; style: ChordProStyle }) {
  return (
    <div style={{ fontFamily: FONT_STACKS[style.fontFamily], fontSize: style.fontSize }}>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {lines.map((line: any, li: number) => {
        const fmt = { bold: false, italic: false, underline: false }

        const hasChords = line.items.some(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (it: any) => it instanceof ChordSheetJS.ChordLyricsPair && it.chords
        )

        // Plain-text section label detection
        if (!hasChords) {
          const txt = line.items
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .filter((it: any) => it instanceof ChordSheetJS.ChordLyricsPair)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .map((it: any) => it.lyrics ?? "")
            .join("").trim()
          if (txt && PLAIN_SECTION_RE.test(txt)) {
            return <SectionHeadingEl key={li} label={txt} color={style.sectionColor} />
          }
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const items = line.items.map((item: any, ii: number) => {
          if (item instanceof ChordSheetJS.Tag) {
            const n = item.name.toLowerCase()
            if (n in FORMAT_ON)  { fmt[FORMAT_ON[n]]  = true;  return null }
            if (n in FORMAT_OFF) { fmt[FORMAT_OFF[n]] = false; return null }
            if (END_TAGS.has(n) || META_TAGS.has(n)) return null
            if (SECTION_TAGS.has(n)) {
              return <SectionHeadingEl key={ii} label={sectionLabel(n, item.value)} color={style.sectionColor} />
            }
            return null
          }
          if (item instanceof ChordSheetJS.ChordLyricsPair) {
            const { bold, italic, underline } = fmt
            const chords = item.chords ?? ""
            const lyrics = item.lyrics ?? ""
            if (!chords && !lyrics) return null
            return (
              <span key={ii} className={cn("inline-block", bold && "font-bold", italic && "italic", underline && "underline")}>
                {hasChords && (
                  <span className="block font-semibold leading-tight" style={{ fontSize: "0.85em", color: style.chordColor, whiteSpace: "pre" }}>
                    {chords || " "}
                  </span>
                )}
                <span className="block leading-snug" style={{ color: style.textColor, whiteSpace: "pre" }}>
                  {lyrics || (hasChords ? " " : "")}
                </span>
              </span>
            )
          }
          return null
        })

        const isBlank = line.items.every(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (it: any) => !(it instanceof ChordSheetJS.ChordLyricsPair) || (!it.chords && !it.lyrics)
        )
        if (isBlank) return <div key={li} className="h-3" />
        return <div key={li} className="mb-1">{items}</div>
      })}
    </div>
  )
}

function SectionHeadingEl({ label, color }: { label: string; color: string }) {
  return (
    <div
      className="font-bold uppercase mt-4 mb-0.5 first:mt-0"
      style={{ fontFamily: "system-ui, sans-serif", fontSize: "0.78em", letterSpacing: "0.07em", color }}
    >
      {label.toUpperCase()}
    </div>
  )
}

// ── Sheet header ───────────────────────────────────────────────────────────────

function SheetHeader({ meta, style, songInfo }: { meta: Record<string, string>; style: ChordProStyle; songInfo?: SongInfo }) {
  const title  = songInfo?.title  || meta.title
  const artist = songInfo?.artist || meta.artist
  const arrangementName = songInfo?.arrangementName
  const bpm    = songInfo?.bpm    != null ? String(songInfo.bpm) : meta.tempo
  const meter  = songInfo?.meter  || meta.time
  const key    = meta.key
  const capo   = meta.capo
  const sequence = songInfo?.sequence?.filter(Boolean) ?? []

  if (!title && !artist && !key && !bpm && !meter && !capo && !sequence.length) return null

  const metaParts: string[] = []
  if (arrangementName) metaParts.push(arrangementName)
  if (artist) metaParts.push(artist)
  if (bpm) metaParts.push(`${bpm} BPM`)
  if (meter) metaParts.push(meter)
  if (key) metaParts.push(`Key of ${key}`)
  if (capo) metaParts.push(`Capo ${capo}`)

  return (
    <div className="mb-4 pb-3 border-b border-border">
      {title && (
        <h2 className="font-bold leading-tight text-foreground" style={{ fontSize: "1.15em" }}>
          {title}
        </h2>
      )}
      {metaParts.length > 0 && (
        <p className="mt-0.5 text-muted-foreground" style={{ fontSize: "0.78em" }}>
          {metaParts.join(" · ")}
        </p>
      )}
      {sequence.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1.5">
          {sequence.map((part, i) => (
            <span
              key={i}
              className="bg-muted text-muted-foreground border border-border"
              style={{ fontSize: "0.68em", padding: "1px 6px", borderRadius: 4 }}
            >
              {part}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Page view with navigation ──────────────────────────────────────────────────
// Renders the page at actual PDF pixel dimensions (8.5×11 in at 96 DPI) then
// scales down with CSS transform so proportions match a real printed page.

const PDF_W = 816   // 8.5 in × 96 dpi
const PDF_H = 1056  // 11  in × 96 dpi

function PageView({
  pages, meta, style, songInfo, dark = false, zoom = 1, pageIndex = 0,
}: {
  pages: Segment[][]
  meta: Record<string, string>
  style: ChordProStyle
  songInfo?: SongInfo
  dark?: boolean
  zoom?: number
  pageIndex?: number
}) {
  // measureRef is a zero-height div used only to read the base container width
  const measureRef = useRef<HTMLDivElement>(null)
  const [baseW, setBaseW] = useState(375)

  useEffect(() => {
    const el = measureRef.current
    if (!el) return
    const update = () => setBaseW(el.clientWidth || 375)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const scale    = (baseW * zoom) / PDF_W
  const scaledH  = Math.round(PDF_H * scale)
  const visualW  = Math.round(baseW * zoom)

  const idx         = Math.min(pageIndex, pages.length - 1)
  const currentPage = pages[idx] ?? []
  const colGapPx    = currentPage.length > 1 ? 24 : 0

  const mT = style.marginTop    * 96
  const mR = style.marginRight  * 96
  const mB = style.marginBottom * 96
  const mL = style.marginLeft   * 96

  return (
    <div>
      {/* Zero-height width probe */}
      <div ref={measureRef} style={{ width: "100%", height: 0 }} />

      {/* Page canvas — sized to full visual width so parent overflow-auto scrolls it */}
      <div style={{ width: visualW, height: scaledH, position: "relative", overflow: "hidden" }}>
        {/* PDF page at native 816×1056 px, scaled with CSS transform */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: PDF_W,
            height: PDF_H,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
            backgroundColor: dark ? "#1c1c1e" : "white",
            boxShadow: dark
              ? "0 2px 16px rgba(0,0,0,0.6), 0 8px 32px rgba(0,0,0,0.4), inset 0 0 0 1px rgba(255,255,255,0.07)"
              : "0 2px 12px rgba(0,0,0,0.15), 0 8px 32px rgba(0,0,0,0.10)",
            padding: `${mT}px ${mR}px ${mB}px ${mL}px`,
            fontSize: style.fontSize,
            overflow: "hidden",
            boxSizing: "border-box",
          }}
        >
          {idx === 0 && <SheetHeader meta={meta} style={style} songInfo={songInfo} />}
          <div style={{ display: "flex", gap: colGapPx, height: "100%" }}>
            {currentPage.map((seg, ci) => (
              <div key={ci} style={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
                <ColumnContent lines={seg.lines} style={style} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Inline view (card, no pagination) ─────────────────────────────────────────

function InlineView({
  segs, meta, style, songInfo,
}: {
  segs: Segment[]
  meta: Record<string, string>
  style: ChordProStyle
  songInfo?: SongInfo
}) {
  return (
    <>
      <SheetHeader meta={meta} style={style} songInfo={songInfo} />
      {segs.map((seg, si) => (
        <div key={si}>
          <ColumnContent lines={seg.lines} style={style} />
          {si < segs.length - 1 && (
            <div className="relative flex items-center my-3">
              <div className="flex-1 border-t border-dashed border-gray-300" />
              <span className="mx-2 bg-white px-1 text-gray-400" style={{ fontSize: "0.65em" }}>
                {seg.pageBreakAfter ? "Page Break" : "Column Break"}
              </span>
              <div className="flex-1 border-t border-dashed border-gray-300" />
            </div>
          )}
        </div>
      ))}
    </>
  )
}

// ── Main export ────────────────────────────────────────────────────────────────

export interface SongInfo {
  title?: string
  artist?: string
  arrangementName?: string
  bpm?: number | null
  meter?: string | null
  sequence?: string[]
}

interface Props {
  chordproText: string
  transpose?: number
  /** Legacy per-render font size (SwipeableSongbook). style.fontSize takes precedence. */
  fontSize?: number
  style?: Partial<ChordProStyle>
  pageView?: boolean
  songInfo?: SongInfo
  /** Render the page with a dark background (pageView only) */
  darkPage?: boolean
  /** Zoom multiplier applied to the page width (pageView only, default 1) */
  zoom?: number
  /** Controlled page index (pageView only, default 0) */
  pageIndex?: number
}

export default function ChordProRenderer({
  chordproText, transpose = 0, fontSize, style: styleProp, pageView = false, songInfo,
  darkPage = false, zoom = 1, pageIndex = 0,
}: Props) {
  const style: ChordProStyle = {
    ...DEFAULT_STYLE,
    ...(fontSize != null ? { fontSize } : {}),
    ...styleProp,
  }

  const parsed = useMemo(() => {
    try {
      const parser = new ChordSheetJS.ChordProParser()
      let song = parser.parse(chordproText)
      if (transpose !== 0) song = song.transpose(transpose)
      return { lines: song.lines, meta: extractMeta(song.lines) }
    } catch { return null }
  }, [chordproText, transpose])

  const layout = useMemo(() => {
    if (!parsed) return null
    const segs = splitSegments(parsed.lines)
    const pages = groupPages(segs)
    return { segs, pages }
  }, [parsed])

  // ── Parse error fallback ───────────────────────────────────────────────────
  if (!parsed || !layout) {
    const fb = (
      <pre className="whitespace-pre-wrap" style={{ fontFamily: FONT_STACKS[style.fontFamily], fontSize: style.fontSize, color: style.textColor }}>
        {chordproText}
      </pre>
    )
    if (pageView) {
      const padding = `${ip(style.marginTop)} ${ip(style.marginRight)} ${ip(style.marginBottom)} ${ip(style.marginLeft)}`
      return (
        <div className="relative w-full" style={{ paddingBottom: `${(11 / 8.5) * 100}%` }}>
          <div className="absolute inset-x-0 top-0 bg-white" style={{ minHeight: "100%", padding, boxShadow: "0 1px 8px rgba(0,0,0,0.12)" }}>
            {fb}
          </div>
        </div>
      )
    }
    return <div className="bg-white rounded-md border shadow-sm p-4">{fb}</div>
  }

  const { segs, pages } = layout
  const { meta } = parsed

  // ── Page view ──────────────────────────────────────────────────────────────
  if (pageView) return <PageView pages={pages} meta={meta} style={style} songInfo={songInfo} dark={darkPage} zoom={zoom} pageIndex={pageIndex} />

  // ── Inline card view ───────────────────────────────────────────────────────
  return (
    <div className="bg-card text-card-foreground rounded-md border shadow-[0_2px_8px_rgba(0,0,0,0.08)] overflow-hidden px-5 py-4">
      <InlineView segs={segs} meta={meta} style={style} songInfo={songInfo} />
    </div>
  )
}
