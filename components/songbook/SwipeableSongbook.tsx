"use client"

import { useState, useRef, useEffect, useLayoutEffect, useCallback, memo } from "react"
import { createPortal } from "react-dom"
import { motion, AnimatePresence, useMotionValue, useDragControls } from "framer-motion"
import { useDrag } from "@use-gesture/react"
import Link from "next/link"
import ChordProRenderer, { getPageCount } from "./ChordProRenderer"
import {
  ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Minus, Plus,
  Pencil, Palette, SquarePen, X, Undo2, Redo2, Check,
} from "lucide-react"

// ── Types ──────────────────────────────────────────────────────────────────────

interface Song {
  id: string
  arrangementId: string
  title: string
  author?: string | null
  arrangement: {
    name: string
    chordproText: string
    bpm?: number | null
    meter?: string | null
    sequence?: string[]
  }
}

interface Props {
  songs: Song[]
  serviceId?: string
  serviceTitle?: string
  serviceDate?: string
}

interface TextBox {
  id: string
  content: string
  x: number  // stored in zoom=1 space
  y: number
  color?: string
  bold?: boolean
  underline?: boolean
  strikethrough?: boolean
  fontSize?: number
}

// ── Constants ──────────────────────────────────────────────────────────────────

const KEYS = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
const FLAT_TO_SHARP: Record<string, string> = {
  Db: "C#", Eb: "D#", Gb: "F#", Ab: "G#", Bb: "A#",
}
const MIN_ZOOM = 0.4
const MAX_ZOOM = 2.5
const COLORS = [
  "#ef4444", "#f97316", "#eab308",
  "#22c55e", "#3b82f6", "#8b5cf6", "#ec4899",
]
// BRUSH_COLORS includes black/white for drawing only
const BRUSH_COLORS = [
  "#111827", "#ffffff",
  "#ef4444", "#f97316", "#eab308",
  "#22c55e", "#3b82f6", "#8b5cf6", "#ec4899",
]
const BRUSH_SIZES = [3, 6, 12, 20]

function extractKey(chordproText: string): string | null {
  const m = chordproText.match(/\{key:\s*([A-G][#b]?)\s*\}/i)
  return m ? m[1] : null
}
function transposeKey(key: string, semitones: number): string {
  const normalized = FLAT_TO_SHARP[key] ?? key
  const idx = KEYS.indexOf(normalized)
  if (idx === -1) return key
  return KEYS[((idx + semitones) % 12 + 12) % 12]
}

// ── localStorage helpers ───────────────────────────────────────────────────────

function storageKey(type: "canvas" | "notes", arrangementId: string) {
  return `songbook:${type}:${arrangementId}`
}
function loadCanvas(arrangementId: string): string | null {
  try { return localStorage.getItem(storageKey("canvas", arrangementId)) } catch { return null }
}
function saveCanvas(arrangementId: string, dataUrl: string) {
  try { localStorage.setItem(storageKey("canvas", arrangementId), dataUrl) } catch {}
}
function loadNotes(arrangementId: string): TextBox[] | null {
  try {
    const raw = localStorage.getItem(storageKey("notes", arrangementId))
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}
function saveNotes(arrangementId: string, boxes: TextBox[]) {
  try { localStorage.setItem(storageKey("notes", arrangementId), JSON.stringify(boxes)) } catch {}
}
function loadZoom(): number {
  try {
    const v = localStorage.getItem("songbook:zoom")
    const n = v ? parseFloat(v) : NaN
    return isNaN(n) ? 1 : Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, n))
  } catch { return 1 }
}
function saveZoom(z: number) {
  try { localStorage.setItem("songbook:zoom", String(z)) } catch {}
}
function loadToolbarExpanded(): boolean {
  try {
    const v = localStorage.getItem("songbook:toolbar-expanded")
    return v !== "false"
  } catch { return true }
}
function saveToolbarExpanded(v: boolean) {
  try { localStorage.setItem("songbook:toolbar-expanded", String(v)) } catch {}
}

// ── Canvas helpers ─────────────────────────────────────────────────────────────

// Re-render the display canvas from the logical (zoom=1) canvas.
function renderFromLogical(
  display: HTMLCanvasElement,
  logical: HTMLCanvasElement,
  zoom: number,
  scrollLeft = 0,
  scrollTop  = 0,
) {
  const ctx = display.getContext("2d")
  if (!ctx) return
  ctx.clearRect(0, 0, display.width, display.height)
  const srcX = scrollLeft / zoom
  const srcY = scrollTop  / zoom
  const srcW = Math.min(display.width  / zoom, logical.width  - srcX)
  const srcH = Math.min(display.height / zoom, logical.height - srcY)
  if (srcW <= 0 || srcH <= 0) return
  ctx.drawImage(logical, srcX, srcY, srcW, srcH, 0, 0, srcW * zoom, srcH * zoom)
}

// ── Floating text box ──────────────────────────────────────────────────────────

const FloatingTextBox = memo(function FloatingTextBox({
  box, zoom, scrollLeftMv, scrollTopMv, containerRef, onChange, onMove, onDelete,
}: {
  box: TextBox
  zoom: number
  scrollLeftMv: ReturnType<typeof useMotionValue<number>>
  scrollTopMv:  ReturnType<typeof useMotionValue<number>>
  containerRef: React.RefObject<HTMLDivElement | null>
  onChange: (id: string, changes: Partial<TextBox>) => void
  onMove: (id: string, x: number, y: number) => void
  onDelete: (id: string) => void
}) {
  const [focused, setFocused] = useState(false)
  const controls = useDragControls()
  const xMv = useMotionValue(box.x * zoom - scrollLeftMv.get())
  const yMv = useMotionValue(box.y * zoom - scrollTopMv.get())

  // Reposition when zoom or scroll changes — useLayoutEffect so position updates before paint
  useLayoutEffect(() => {
    const update = () => {
      xMv.set(box.x * zoom - scrollLeftMv.get())
      yMv.set(box.y * zoom - scrollTopMv.get())
    }
    update()
    const unsubL = scrollLeftMv.on("change", update)
    const unsubT = scrollTopMv.on("change", update)
    return () => { unsubL(); unsubT() }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoom, box.x, box.y])

  const effectiveFontSize = box.fontSize ?? 13
  const pad = Math.round(6 * zoom)

  const textDecoration = [
    box.underline ? "underline" : null,
    box.strikethrough ? "line-through" : null,
  ].filter((x): x is string => x !== null).join(" ") || undefined

  // Formatting toolbar: fixed at bottom of viewport so it sits above the mobile keyboard.
  // onMouseDown={e.preventDefault()} prevents textarea blur before click fires.
  const toolbar = focused ? createPortal(
    <div
      style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 9999 }}
      className="flex items-center gap-1 bg-card border-t px-3 py-2 flex-wrap"
    >
      {/* Auto color — inherits theme foreground */}
      <button
        onMouseDown={e => e.preventDefault()}
        onPointerDown={e => e.stopPropagation()}
        onClick={() => onChange(box.id, { color: undefined })}
        title="Auto"
        className={`w-6 h-6 text-[9px] font-semibold rounded flex items-center justify-center border-2 transition-all ${
          !box.color
            ? "border-primary ring-1 ring-primary text-foreground"
            : "border-border text-muted-foreground hover:border-muted-foreground"
        }`}
      >
        A
      </button>
      {/* Color swatches — accent colors only; use Auto for black/white */}
      {COLORS.map(c => (
        <button key={c}
          onMouseDown={e => e.preventDefault()}
          onPointerDown={e => e.stopPropagation()}
          onClick={() => onChange(box.id, { color: c })}
          style={{ background: c }}
          className={`w-5 h-5 rounded-full border-2 border-transparent transition-all ${
            c === box.color ? "scale-125 ring-2 ring-primary ring-offset-1" : "hover:scale-110"
          }`}
        />
      ))}
      <div className="w-px h-4 bg-border mx-0.5" />
      <button
        onMouseDown={e => e.preventDefault()}
        onPointerDown={e => e.stopPropagation()}
        onClick={() => onChange(box.id, { bold: !box.bold })}
        className={`w-7 h-7 text-xs font-bold rounded flex items-center justify-center ${box.bold ? "bg-primary text-primary-foreground" : "hover:bg-accent text-muted-foreground"}`}>
        B
      </button>
      <button
        onMouseDown={e => e.preventDefault()}
        onPointerDown={e => e.stopPropagation()}
        onClick={() => onChange(box.id, { underline: !box.underline })}
        className={`w-7 h-7 text-xs underline rounded flex items-center justify-center ${box.underline ? "bg-primary text-primary-foreground" : "hover:bg-accent text-muted-foreground"}`}>
        U
      </button>
      <button
        onMouseDown={e => e.preventDefault()}
        onPointerDown={e => e.stopPropagation()}
        onClick={() => onChange(box.id, { strikethrough: !box.strikethrough })}
        className={`w-7 h-7 text-xs line-through rounded flex items-center justify-center ${box.strikethrough ? "bg-primary text-primary-foreground" : "hover:bg-accent text-muted-foreground"}`}>
        S
      </button>
      <div className="w-px h-4 bg-border mx-0.5" />
      <button
        onMouseDown={e => e.preventDefault()}
        onPointerDown={e => e.stopPropagation()}
        onClick={() => onChange(box.id, { fontSize: Math.max(8, effectiveFontSize - 1) })}
        className="w-7 h-7 text-sm flex items-center justify-center rounded hover:bg-accent text-muted-foreground">
        −
      </button>
      <span className="text-xs w-6 text-center text-muted-foreground">{effectiveFontSize}</span>
      <button
        onMouseDown={e => e.preventDefault()}
        onPointerDown={e => e.stopPropagation()}
        onClick={() => onChange(box.id, { fontSize: Math.min(32, effectiveFontSize + 1) })}
        className="w-7 h-7 text-sm flex items-center justify-center rounded hover:bg-accent text-muted-foreground">
        +
      </button>
      <div className="flex-1" />
      <button
        onMouseDown={e => e.preventDefault()}
        onPointerDown={e => e.stopPropagation()}
        onClick={() => onDelete(box.id)}
        className="w-7 h-7 flex items-center justify-center rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
        <X className="h-3.5 w-3.5" />
      </button>
    </div>,
    document.body
  ) : null

  return (
    <motion.div
      drag
      dragMomentum={false}
      dragConstraints={containerRef}
      dragControls={controls}
      dragListener={false}
      style={{ x: xMv, y: yMv }}
      onDragEnd={() => onMove(
        box.id,
        (xMv.get() + scrollLeftMv.get()) / zoom,
        (yMv.get() + scrollTopMv.get())  / zoom,
      )}
      className="absolute z-20"
    >
      {/* Portal toolbar — rendered to document.body, sits above keyboard */}
      {toolbar}

      {/* Drag handle — visible on focus */}
      {focused && (
        <div
          className="absolute -top-4 left-0 right-0 h-4 cursor-move flex items-center justify-center"
          onPointerDown={e => { e.stopPropagation(); controls.start(e) }}
        >
          <div className="w-6 h-0.5 rounded-full bg-muted-foreground/40" />
        </div>
      )}
      {/* Transparent container — no background, subtle focus ring only */}
      <div className={`rounded transition-all ${focused ? "ring-1 ring-primary/50" : ""}`}>
        <textarea
          className="bg-transparent placeholder:text-muted-foreground/30 focus:outline-none border-0 block"
          style={{
            fontSize: Math.round(effectiveFontSize * zoom),
            padding: pad,
            lineHeight: 1.5,
            resize: "both",
            minWidth:  Math.round(80  * zoom),
            minHeight: Math.round(20  * zoom),
            cursor: focused ? "text" : "move",
            color: box.color,
            fontWeight: box.bold ? "bold" : undefined,
            textDecoration,
          }}
          placeholder="Notes…"
          value={box.content}
          rows={2}
          onPointerDown={e => {
            if (!focused) {
              controls.start(e)
            } else {
              e.stopPropagation()
            }
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onChange={e => onChange(box.id, { content: e.target.value })}
        />
      </div>
    </motion.div>
  )
})

// ── Main component ─────────────────────────────────────────────────────────────

export default function SwipeableSongbook({ songs, serviceId, serviceTitle, serviceDate }: Props) {
  const [index, setIndex]           = useState(0)
  const [direction, setDirection]   = useState(0)
  const [transpose, setTranspose]   = useState(0)
  const [pageIndex, setPageIndex]   = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [zoom, setZoom]             = useState(1)
  const [fontSize, setFontSize]     = useState(14)
  const [fontFamily, setFontFamily] = useState<"mono" | "serif" | "sans">("mono")
  const [chordColor, setChordColor] = useState("#2563eb")
  const [showStylePanel, setShowStylePanel] = useState(false)
  const [isDark, setIsDark]         = useState(false)
  const [toolbarExpanded, setToolbarExpanded] = useState(true)
  const [zoomSaved, setZoomSaved] = useState(false)

  // Scroll position of the chord-sheet container (motion values for zero-render updates)
  const scrollTopMv  = useMotionValue(0)
  const scrollLeftMv = useMotionValue(0)

  // Drawing
  const [drawMode, setDrawMode]     = useState(false)
  const [eraserMode, setEraserMode] = useState(false)
  const [brushSize, setBrushSize]   = useState(6)
  const [brushColor, setBrushColor] = useState("#111827")
  const [canUndo, setCanUndo]       = useState(false)
  const [canRedo, setCanRedo]       = useState(false)

  // Text boxes (per song)
  const [textBoxes, setTextBoxes]   = useState<TextBox[]>([])

  // Refs
  const contentRef       = useRef<HTMLDivElement>(null)
  const canvasRef        = useRef<HTMLCanvasElement>(null)      // display canvas
  const logicalCanvasRef = useRef<HTMLCanvasElement | null>(null) // zoom=1 source of truth
  const isDrawing        = useRef(false)
  const lastPoint        = useRef<{ x: number; y: number } | null>(null)
  const prevIdxRef       = useRef(0)
  const zoomRef          = useRef(1)   // kept in sync for use inside callbacks
  const historyRef       = useRef<string[]>([""])
  const historyIdxRef    = useRef(0)
  const eraserModeRef    = useRef(false)
  const brushSizeRef     = useRef(6)
  const brushColorRef    = useRef("#111827")

  // Per-song in-memory caches
  const canvasCacheRef     = useRef<Map<string, string>>(new Map())
  const notesCacheRef      = useRef<Map<string, TextBox[]>>(new Map())
  const canvasRestoringRef = useRef(false)  // true while firstResize img is loading

  // Latest-value refs (read inside effects/callbacks without stale closures)
  const textBoxesRef = useRef<TextBox[]>([])
  const currentIdRef = useRef<string | undefined>(songs[0]?.arrangementId)

  // zoomRef updated during render (not in effect) so unmount cleanup always has latest value
  zoomRef.current = zoom

  useEffect(() => { textBoxesRef.current  = textBoxes },         [textBoxes])
  useEffect(() => { currentIdRef.current  = songs[index]?.arrangementId }, [index, songs])
  useEffect(() => { eraserModeRef.current = eraserMode },        [eraserMode])
  useEffect(() => { brushSizeRef.current  = brushSize },         [brushSize])
  useEffect(() => { brushColorRef.current = brushColor },        [brushColor])

  // ── 0. Load persisted UI state on mount ───────────────────────────────────

  useEffect(() => {
    setZoom(loadZoom())
    setToolbarExpanded(loadToolbarExpanded())
  }, []) // mount only

  // ── 1. Load persisted canvas/notes data on mount ──────────────────────────

  useEffect(() => {
    songs.forEach(s => {
      const cv = loadCanvas(s.arrangementId)
      if (cv) canvasCacheRef.current.set(s.arrangementId, cv)
      const nt = loadNotes(s.arrangementId)
      if (nt) notesCacheRef.current.set(s.arrangementId, nt)
    })
    const firstId = songs[0]?.arrangementId
    if (firstId) {
      const saved = notesCacheRef.current.get(firstId)
      if (saved?.length) setTextBoxes(saved)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // mount only

  // ── 2. Canvas setup & resize ───────────────────────────────────────────────

  useEffect(() => {
    const display   = canvasRef.current
    const container = contentRef.current
    if (!display || !container) return

    // Create the offscreen logical canvas (zoom=1 space)
    const logical = document.createElement("canvas")
    logicalCanvasRef.current = logical

    let firstResize = true

    const resize = () => {
      const w = container.clientWidth
      const h = container.clientHeight

      if (firstResize) {
        firstResize = false
        display.width  = w
        display.height = h
        logical.width  = w
        logical.height = h

        // Restore saved drawing for the initial song into logical canvas
        const id    = currentIdRef.current
        const saved = id ? canvasCacheRef.current.get(id) : null
        if (saved) {
          canvasRestoringRef.current = true
          const img = new Image()
          img.onload = () => {
            canvasRestoringRef.current = false
            logical.getContext("2d")?.drawImage(img, 0, 0)
            renderFromLogical(display, logical, zoomRef.current, 0, 0)
          }
          img.src = saved
        }
      } else {
        // Subsequent resizes: preserve logical canvas content
        const dataUrl = logical.width > 0 ? logical.toDataURL() : ""
        display.width  = w
        display.height = h
        logical.width  = w
        logical.height = h
        if (dataUrl) {
          const img = new Image()
          img.onload = () => {
            logical.getContext("2d")?.drawImage(img, 0, 0)
            renderFromLogical(display, logical, zoomRef.current, scrollLeftMv.get(), scrollTopMv.get())
          }
          img.src = dataUrl
        }
      }
    }

    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(container)
    return () => ro.disconnect()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // mount only — scrollLeftMv/scrollTopMv are stable motion value refs

  // ── 3. Save everything on unmount ─────────────────────────────────────────

  useEffect(() => {
    const logical = logicalCanvasRef
    return () => {
      const id = currentIdRef.current
      if (!id) return
      const lc = logical.current
      if (lc && lc.width > 0) saveCanvas(id, lc.toDataURL())
      saveNotes(id, textBoxesRef.current)
      saveZoom(zoomRef.current)
    }
  }, []) // mount only, cleanup on unmount

  // ── 4. Re-render display when zoom changes; persist zoom ──────────────────

  const zoomInitializedRef = useRef(false)

  useEffect(() => {
    // Skip saving on very first run (zoom=1 initial state) — Effect #0 will trigger the
    // correct saved zoom, which fires a second run that saves the right value.
    if (!zoomInitializedRef.current) {
      zoomInitializedRef.current = true
    } else {
      saveZoom(zoom)
    }
    // Don't overwrite canvas with blank while the initial canvas is still loading from storage
    if (canvasRestoringRef.current) return
    const display = canvasRef.current
    const logical = logicalCanvasRef.current
    if (!display || !logical || display.width === 0) return
    renderFromLogical(display, logical, zoom, scrollLeftMv.get(), scrollTopMv.get())
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoom])

  // ── 5. Save/restore canvas + notes when switching songs ───────────────────

  useEffect(() => {
    const display = canvasRef.current
    const logical = logicalCanvasRef.current
    if (!display || !logical) return

    const prevId = songs[prevIdxRef.current]?.arrangementId
    const nextId = songs[index]?.arrangementId

    if (prevId && prevId !== nextId) {
      // Persist previous song's logical canvas
      if (logical.width > 0) {
        const dataUrl = logical.toDataURL()
        canvasCacheRef.current.set(prevId, dataUrl)
        saveCanvas(prevId, dataUrl)
      }
      // Persist previous song's notes
      notesCacheRef.current.set(prevId, textBoxesRef.current)
      saveNotes(prevId, textBoxesRef.current)

      // Reset scroll for the incoming song
      scrollTopMv.set(0)
      scrollLeftMv.set(0)

      // Restore next song's logical canvas
      const lCtx = logical.getContext("2d")!
      lCtx.clearRect(0, 0, logical.width, logical.height)
      const nextCanvas = canvasCacheRef.current.get(nextId ?? "")
        ?? loadCanvas(nextId ?? "")
        ?? null
      if (nextCanvas && nextId) {
        canvasCacheRef.current.set(nextId, nextCanvas)
        const img = new Image()
        img.onload = () => {
          lCtx.drawImage(img, 0, 0)
          renderFromLogical(display, logical, zoomRef.current, 0, 0)
        }
        img.src = nextCanvas
      } else {
        renderFromLogical(display, logical, zoomRef.current, 0, 0)
      }

      // Restore next song's notes
      const nextNotes = notesCacheRef.current.get(nextId ?? "")
        ?? loadNotes(nextId ?? "")
        ?? []
      if (nextId) notesCacheRef.current.set(nextId, nextNotes)
      setTextBoxes(nextNotes)

      // Reset undo history for new song
      historyRef.current = [""]
      historyIdxRef.current = 0
      setCanUndo(false)
      setCanRedo(false)
    }

    prevIdxRef.current = index
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, songs]) // scrollLeftMv/scrollTopMv are stable motion value refs

  // ── 6. Persist text boxes whenever they change ────────────────────────────

  useEffect(() => {
    const id = currentIdRef.current
    if (!id) return
    notesCacheRef.current.set(id, textBoxes)
    saveNotes(id, textBoxes)
  }, [textBoxes])

  // ── 7. Save on page visibility change (mobile navigation safety) ──────────

  useEffect(() => {
    const save = () => {
      if (document.visibilityState !== "hidden") return
      const id = currentIdRef.current
      if (!id) return
      const lc = logicalCanvasRef.current
      if (lc && lc.width > 0) saveCanvas(id, lc.toDataURL())
      saveNotes(id, textBoxesRef.current)
    }
    document.addEventListener("visibilitychange", save)
    return () => document.removeEventListener("visibilitychange", save)
  }, [])

  // ── 8. Dark mode detection ─────────────────────────────────────────────────

  useEffect(() => {
    const check = () => {
      const dark = document.documentElement.classList.contains("dark")
      setIsDark(dark)
      setBrushColor(c => (c === BRUSH_COLORS[0] || c === BRUSH_COLORS[1]) ? (dark ? BRUSH_COLORS[1] : BRUSH_COLORS[0]) : c)
    }
    check()
    const obs = new MutationObserver(check)
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] })
    return () => obs.disconnect()
  }, [])

  // ── 9. Recompute total pages on song / transpose change ───────────────────

  useEffect(() => {
    const count = getPageCount(songs[index].arrangement.chordproText, transpose)
    setTotalPages(count)
    setPageIndex(0)
    scrollTopMv.set(0)
    scrollLeftMv.set(0)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, transpose])

  // ── 10. Keyboard navigation + undo/redo shortcuts ─────────────────────────

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (document.activeElement?.tagName === "TEXTAREA") return
      if (e.key === "ArrowRight") goNext()
      if (e.key === "ArrowLeft") goPrev()
      if ((e.metaKey || e.ctrlKey) && e.key === "z" && !e.shiftKey) { e.preventDefault(); undo() }
      if ((e.metaKey || e.ctrlKey) && (e.key === "y" || (e.key === "z" && e.shiftKey))) { e.preventDefault(); redo() }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, pageIndex, songs.length, totalPages])

  // ── 11. Ctrl+wheel zoom (trackpad pinch) ──────────────────────────────────

  useEffect(() => {
    const el = contentRef.current
    if (!el) return
    const handler = (e: WheelEvent) => {
      if (!e.ctrlKey) return
      e.preventDefault()
      setZoom(z => parseFloat(Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z - e.deltaY * 0.01)).toFixed(2)))
    }
    el.addEventListener("wheel", handler, { passive: false })
    return () => el.removeEventListener("wheel", handler)
  }, [])

  // ── 12. Two-finger pinch-to-zoom on touchscreen ───────────────────────────

  useEffect(() => {
    const el = contentRef.current
    if (!el) return
    let lastDist = 0

    function getTouchDist(e: TouchEvent) {
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      return Math.sqrt(dx * dx + dy * dy)
    }

    function onTouchStart(e: TouchEvent) {
      if (e.touches.length === 2) lastDist = getTouchDist(e)
    }

    function onTouchMove(e: TouchEvent) {
      if (e.touches.length !== 2) return
      e.preventDefault()
      const dist = getTouchDist(e)
      if (lastDist > 0) {
        const scale = dist / lastDist
        setZoom(z => parseFloat(Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z * scale)).toFixed(2)))
      }
      lastDist = dist
    }

    function onTouchEnd(e: TouchEvent) {
      if (e.touches.length < 2) lastDist = 0
    }

    el.addEventListener("touchstart", onTouchStart, { passive: true })
    el.addEventListener("touchmove", onTouchMove, { passive: false })
    el.addEventListener("touchend", onTouchEnd)
    return () => {
      el.removeEventListener("touchstart", onTouchStart)
      el.removeEventListener("touchmove", onTouchMove)
      el.removeEventListener("touchend", onTouchEnd)
    }
  }, [])

  // ── Navigation ─────────────────────────────────────────────────────────────

  function goNext() {
    if (pageIndex < totalPages - 1) {
      setPageIndex(p => p + 1)
    } else if (index < songs.length - 1) {
      setDirection(1); setIndex(i => i + 1); setTranspose(0)
    }
  }
  function goPrev() {
    if (pageIndex > 0) {
      setPageIndex(p => p - 1)
    } else if (index > 0) {
      setDirection(-1); setIndex(i => i - 1); setTranspose(0)
    }
  }

  // One-finger swipe switches songs (only at zoom=1, otherwise pan via scroll)
  const bind = useDrag(({ swipe: [swipeX] }) => {
    if (zoom > 1 || drawMode) return
    if (swipeX === -1) goNext()
    if (swipeX === 1) goPrev()
  })

  // ── Undo / Redo ────────────────────────────────────────────────────────────

  const restoreHistory = useCallback((idx: number) => {
    const display = canvasRef.current
    const logical = logicalCanvasRef.current
    if (!display || !logical) return
    const lCtx = logical.getContext("2d")!
    lCtx.clearRect(0, 0, logical.width, logical.height)
    const dataUrl = historyRef.current[idx]
    if (dataUrl) {
      const img = new Image()
      img.onload = () => {
        lCtx.drawImage(img, 0, 0)
        renderFromLogical(display, logical, zoomRef.current, scrollLeftMv.get(), scrollTopMv.get())
      }
      img.src = dataUrl
    } else {
      renderFromLogical(display, logical, zoomRef.current, scrollLeftMv.get(), scrollTopMv.get())
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const pushHistory = useCallback(() => {
    const logical = logicalCanvasRef.current
    if (!logical) return
    const dataUrl = logical.toDataURL()
    const trimmed = historyRef.current.slice(0, historyIdxRef.current + 1)
    trimmed.push(dataUrl)
    historyRef.current = trimmed
    historyIdxRef.current = trimmed.length - 1
    setCanUndo(historyIdxRef.current > 0)
    setCanRedo(false)
    const id = currentIdRef.current
    if (id) saveCanvas(id, dataUrl)
  }, [])

  const undo = useCallback(() => {
    if (historyIdxRef.current <= 0) return
    historyIdxRef.current--
    restoreHistory(historyIdxRef.current)
    setCanUndo(historyIdxRef.current > 0)
    setCanRedo(true)
  }, [restoreHistory])

  const redo = useCallback(() => {
    if (historyIdxRef.current >= historyRef.current.length - 1) return
    historyIdxRef.current++
    restoreHistory(historyIdxRef.current)
    setCanRedo(historyIdxRef.current < historyRef.current.length - 1)
    setCanUndo(true)
  }, [restoreHistory])

  // ── Canvas drawing ─────────────────────────────────────────────────────────

  function onCanvasPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    isDrawing.current = true
    const rect = canvasRef.current!.getBoundingClientRect()
    lastPoint.current = { x: e.clientX - rect.left, y: e.clientY - rect.top }
    canvasRef.current!.setPointerCapture(e.pointerId)
  }

  function onCanvasPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!isDrawing.current || !lastPoint.current) return
    const display = canvasRef.current!
    const logical = logicalCanvasRef.current!
    const rect    = display.getBoundingClientRect()
    const z       = zoomRef.current
    const eraser  = eraserModeRef.current
    const color   = brushColorRef.current
    const size    = brushSizeRef.current

    const sx = e.clientX - rect.left
    const sy = e.clientY - rect.top
    const fromSx = lastPoint.current.x
    const fromSy = lastPoint.current.y

    const sl = scrollLeftMv.get(), st = scrollTopMv.get()
    const lx = (sx + sl) / z,     ly = (sy + st) / z
    const fromLx = (fromSx + sl) / z, fromLy = (fromSy + st) / z

    const composite: GlobalCompositeOperation = eraser ? "destination-out" : "source-over"
    const strokeStyle = eraser ? "rgba(0,0,0,1)" : color

    const dCtx = display.getContext("2d")!
    dCtx.beginPath()
    dCtx.moveTo(fromSx, fromSy)
    dCtx.lineTo(sx, sy)
    dCtx.globalCompositeOperation = composite
    dCtx.strokeStyle = strokeStyle
    dCtx.lineWidth   = size * z
    dCtx.lineCap     = "round"
    dCtx.lineJoin    = "round"
    dCtx.stroke()
    dCtx.globalCompositeOperation = "source-over"

    const lCtx = logical.getContext("2d")!
    lCtx.beginPath()
    lCtx.moveTo(fromLx, fromLy)
    lCtx.lineTo(lx, ly)
    lCtx.globalCompositeOperation = composite
    lCtx.strokeStyle = strokeStyle
    lCtx.lineWidth   = size
    lCtx.lineCap     = "round"
    lCtx.lineJoin    = "round"
    lCtx.stroke()
    lCtx.globalCompositeOperation = "source-over"

    lastPoint.current = { x: sx, y: sy }
  }

  function onCanvasPointerUp() {
    if (isDrawing.current) {
      isDrawing.current = false
      lastPoint.current = null
      const display = canvasRef.current
      const logical = logicalCanvasRef.current
      if (display && logical)
        renderFromLogical(display, logical, zoomRef.current, scrollLeftMv.get(), scrollTopMv.get())
      pushHistory()
    }
  }

  // ── Text boxes ─────────────────────────────────────────────────────────────

  const addTextBox = useCallback(() => {
    setTextBoxes(prev => [...prev, {
      id: crypto.randomUUID(),
      content: "",
      x: (24 + Math.random() * 60) / zoomRef.current,
      y: (24 + Math.random() * 40) / zoomRef.current,
    }])
  }, [])

  const moveTextBox = useCallback((id: string, x: number, y: number) => {
    setTextBoxes(prev => prev.map(b => b.id === id ? { ...b, x, y } : b))
  }, [])

  const updateTextBox = useCallback((id: string, changes: Partial<TextBox>) => {
    setTextBoxes(prev => prev.map(b => b.id === id ? { ...b, ...changes } : b))
  }, [])

  const removeTextBox = useCallback((id: string) => {
    setTextBoxes(prev => prev.filter(b => b.id !== id))
  }, [])

  // ── Render ─────────────────────────────────────────────────────────────────

  if (songs.length === 0) {
    return <p className="text-center text-muted-foreground mt-20">No songs in this service.</p>
  }

  const current = songs[index]
  const originalKey = extractKey(current.arrangement.chordproText)
  const displayKey = originalKey
    ? transposeKey(originalKey, transpose)
    : transpose === 0 ? "—" : transpose > 0 ? `+${transpose}` : String(transpose)

  const variants = {
    enter: (d: number) => ({ x: d > 0 ? 400 : -400, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit:   (d: number) => ({ x: d > 0 ? -400 : 400, opacity: 0 }),
  }

  const iconBtn = (active = false, disabled = false) =>
    `h-7 w-7 flex items-center justify-center rounded border transition-colors ${
      disabled ? "opacity-30 cursor-not-allowed" :
      active   ? "bg-accent text-foreground border-accent" :
                 "text-muted-foreground hover:bg-accent"
    }`

  const backHref  = serviceId ? `/mychurch/services/${serviceId}` : "/mychurch/services"
  const backLabel = serviceTitle
    || (serviceDate
      ? new Date(serviceDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
      : "Back")

  return (
    <div className="flex flex-col h-[calc(100vh-48px)] bg-background">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="border-b bg-card shrink-0">

        {/* Row 1: always visible — Back, song nav, toolbar toggle */}
        <div className="flex items-center px-3 py-2 gap-2">
          <div className="flex items-center gap-1 shrink-0">
            <Link
              href={backHref}
              className="flex items-center gap-0.5 text-xs text-muted-foreground hover:text-foreground transition-colors pr-2 border-r mr-1 max-w-[140px]"
            >
              <ChevronLeft className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{backLabel}</span>
            </Link>
            <button onClick={goPrev} disabled={index === 0} className={iconBtn(false, index === 0)}>
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-medium text-foreground tabular-nums w-14 text-center">
              {index + 1} / {songs.length}
            </span>
            <button onClick={goNext} disabled={index === songs.length - 1} className={iconBtn(false, index === songs.length - 1)}>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <div className="flex-1" />
          <button
            onClick={() => {
              const next = !toolbarExpanded
              setToolbarExpanded(next)
              saveToolbarExpanded(next)
            }}
            title={toolbarExpanded ? "Collapse toolbar" : "Expand toolbar"}
            className={iconBtn()}
          >
            {toolbarExpanded
              ? <ChevronUp className="h-3.5 w-3.5" />
              : <ChevronDown className="h-3.5 w-3.5" />
            }
          </button>
        </div>

        {/* Row 2: collapsible — Key, Zoom, Style/Draw/TextBox */}
        {toolbarExpanded && (
          <div className="flex items-center gap-1.5 flex-wrap px-3 pb-2 gap-y-1.5">
            <span className="text-xs text-muted-foreground">Key</span>
            <button onClick={() => setTranspose(t => t - 1)} className={iconBtn()}>
              <Minus className="h-3 w-3" />
            </button>
            <span className="text-sm w-8 text-center font-medium text-foreground">{displayKey}</span>
            <button onClick={() => setTranspose(t => t + 1)} className={iconBtn()}>
              <Plus className="h-3 w-3" />
            </button>

            <div className="w-px h-5 bg-border mx-0.5" />

            <span className="text-xs text-muted-foreground">Zoom</span>
            <button
              onClick={() => { saveZoom(zoom); setZoomSaved(true); setTimeout(() => setZoomSaved(false), 1500) }}
              title="Save zoom as default"
              className={iconBtn(zoomSaved)}
            >
              <Check className="h-3 w-3" />
            </button>
            {zoom !== 1 && (
              <button onClick={() => setZoom(1)} className="text-xs text-muted-foreground hover:text-foreground underline">
                Reset
              </button>
            )}

            <div className="w-px h-5 bg-border mx-0.5" />

            <button onClick={() => setShowStylePanel(v => !v)} title="Font & color" className={iconBtn(showStylePanel)}>
              <Palette className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => { setDrawMode(v => !v); if (drawMode) setEraserMode(false) }}
              title={drawMode ? "Exit draw" : "Draw"}
              className={iconBtn(drawMode)}
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button onClick={addTextBox} title="Add text box" className={iconBtn()}>
              <SquarePen className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* ── Style panel ──────────────────────────────────────────────────────── */}
      {toolbarExpanded && showStylePanel && (
        <div className="flex items-center flex-wrap gap-x-4 gap-y-1.5 px-4 py-2 border-b bg-card shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Font</span>
            <div className="flex gap-1">
              {(["mono", "serif", "sans"] as const).map(f => (
                <button key={f} onClick={() => setFontFamily(f)}
                  className={`px-2.5 py-0.5 rounded text-xs border transition-colors ${fontFamily === f ? "bg-primary text-primary-foreground border-primary" : "hover:bg-accent text-muted-foreground"}`}>
                  {f === "mono" ? "Mono" : f === "serif" ? "Serif" : "Sans"}
                </button>
              ))}
            </div>
          </div>
          <div className="w-px h-4 bg-border" />
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground">Size</span>
            <button onClick={() => setFontSize(f => Math.max(10, f - 1))} className={iconBtn()}><Minus className="h-3 w-3" /></button>
            <span className="text-xs text-muted-foreground w-5 text-center">{fontSize}</span>
            <button onClick={() => setFontSize(f => Math.min(22, f + 1))} className={iconBtn()}><Plus className="h-3 w-3" /></button>
          </div>
          <div className="w-px h-4 bg-border" />
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Chord color</span>
            <input type="color" value={chordColor} onChange={e => setChordColor(e.target.value)}
              className="h-6 w-10 rounded cursor-pointer border bg-transparent p-0.5" />
            <button onClick={() => setChordColor("#2563eb")} className="text-xs text-muted-foreground hover:text-foreground underline">Reset</button>
          </div>
        </div>
      )}

      {/* ── Draw toolbar ─────────────────────────────────────────────────────── */}
      {toolbarExpanded && drawMode && (
        <div className="flex items-center flex-wrap gap-x-3 gap-y-1.5 px-4 py-2 border-b bg-card shrink-0">
          <div className="flex items-center gap-1">
            {BRUSH_COLORS.map(c => (
              <button
                key={c}
                onClick={() => { setBrushColor(c); setEraserMode(false) }}
                title={c}
                style={{ background: c }}
                className={`w-5 h-5 rounded-full border-2 transition-all ${
                  c === "#ffffff" ? "border-border" : "border-transparent"
                } ${c === brushColor && !eraserMode ? "scale-125 ring-2 ring-primary ring-offset-1" : "hover:scale-110"}`}
              />
            ))}
          </div>

          <div className="w-px h-4 bg-border" />

          <div className="flex items-center gap-1">
            {BRUSH_SIZES.map(s => (
              <button key={s} onClick={() => setBrushSize(s)} title={`${s}px`}
                className={`flex items-center justify-center w-7 h-7 rounded border transition-colors ${brushSize === s ? "bg-accent border-accent" : "hover:bg-accent"}`}>
                <div className="rounded-full" style={{
                  width: Math.min(s * 1.5, 20),
                  height: Math.min(s * 1.5, 20),
                  background: eraserMode ? "hsl(var(--muted-foreground))" : brushColor,
                }} />
              </button>
            ))}
          </div>

          <div className="w-px h-4 bg-border" />

          <button
            onClick={() => setEraserMode(v => !v)}
            className={`px-2.5 py-0.5 rounded text-xs border transition-colors ${eraserMode ? "bg-primary text-primary-foreground border-primary" : "hover:bg-accent text-muted-foreground"}`}
          >
            Eraser
          </button>

          <div className="w-px h-4 bg-border" />

          <button onClick={undo} disabled={!canUndo} title="Undo (⌘Z)" className={iconBtn(false, !canUndo)}>
            <Undo2 className="h-3.5 w-3.5" />
          </button>
          <button onClick={redo} disabled={!canRedo} title="Redo (⌘⇧Z)" className={iconBtn(false, !canRedo)}>
            <Redo2 className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* ── Content ──────────────────────────────────────────────────────────── */}
      {/* bind() disabled in drawMode so @use-gesture/react doesn't preventDefault on pointer events */}
      <div ref={contentRef} className="flex-1 overflow-hidden relative bg-muted" {...(drawMode ? {} : bind())}>
        {/* Left / right nav buttons — no gradient, always available alongside swipe */}
        {index > 0 && (
          <button onClick={goPrev} onPointerDown={e => e.stopPropagation()}
            className="absolute left-0 top-0 bottom-0 w-10 z-10 flex items-center justify-start pl-1 text-muted-foreground/40 hover:text-muted-foreground transition-colors"
            aria-label="Previous">
            <ChevronLeft className="h-8 w-8" />
          </button>
        )}
        {index < songs.length - 1 && (
          <button onClick={goNext} onPointerDown={e => e.stopPropagation()}
            className="absolute right-0 top-0 bottom-0 w-10 z-10 flex items-center justify-end pr-1 text-muted-foreground/40 hover:text-muted-foreground transition-colors"
            aria-label="Next">
            <ChevronRight className="h-8 w-8" />
          </button>
        )}

        <AnimatePresence initial={false} custom={direction}>
          <motion.div
            key={current.id}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="absolute inset-0 overflow-auto py-4 px-12"
            onScroll={e => {
              const el = e.currentTarget
              scrollLeftMv.set(el.scrollLeft)
              scrollTopMv.set(el.scrollTop)
              const d = canvasRef.current, l = logicalCanvasRef.current
              if (d && l) renderFromLogical(d, l, zoomRef.current, el.scrollLeft, el.scrollTop)
            }}
          >
            <ChordProRenderer
              chordproText={current.arrangement.chordproText}
              transpose={transpose}
              pageView
              pageIndex={pageIndex}
              darkPage={isDark}
              zoom={zoom}
              style={{
                fontFamily,
                fontSize,
                chordColor,
                textColor:    isDark ? "#e5e7eb" : "#111827",
                sectionColor: isDark ? "#9ca3af" : "#374151",
              }}
              songInfo={{
                title: current.title,
                artist: current.author ?? undefined,
                arrangementName: current.arrangement.name,
                bpm: current.arrangement.bpm,
                meter: current.arrangement.meter,
                sequence: current.arrangement.sequence,
              }}
            />
          </motion.div>
        </AnimatePresence>

        {/* Display canvas — shows logical canvas scaled by zoom */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 z-10"
          style={{
            pointerEvents: drawMode ? "auto" : "none",
            cursor: drawMode ? (eraserMode ? "cell" : "crosshair") : "default",
            touchAction: "none",
          }}
          onPointerDown={onCanvasPointerDown}
          onPointerMove={onCanvasPointerMove}
          onPointerUp={onCanvasPointerUp}
          onPointerLeave={onCanvasPointerUp}
        />

        {textBoxes.map(box => (
          <FloatingTextBox
            key={box.id}
            box={box}
            zoom={zoom}
            scrollLeftMv={scrollLeftMv}
            scrollTopMv={scrollTopMv}
            containerRef={contentRef}
            onChange={updateTextBox}
            onMove={moveTextBox}
            onDelete={removeTextBox}
          />
        ))}
      </div>

      {/* ── Dot indicator ────────────────────────────────────────────────────── */}
      <div className="flex justify-center gap-1 py-2 shrink-0 bg-card border-t">
        {songs.map((_, i) => (
          <button key={i}
            onClick={() => { setDirection(i > index ? 1 : -1); setIndex(i); setTranspose(0) }}
            className={`w-2 h-2 rounded-full transition-colors ${i === index ? "bg-foreground" : "bg-muted-foreground/30"}`}
          />
        ))}
      </div>
    </div>
  )
}
