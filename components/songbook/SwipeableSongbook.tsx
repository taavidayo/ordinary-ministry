"use client"

import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence, useDragControls } from "framer-motion"
import { useDrag } from "@use-gesture/react"
import ChordProRenderer from "./ChordProRenderer"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ChevronLeft, ChevronRight, Minus, Plus, StickyNote, GripHorizontal, X } from "lucide-react"

interface Song {
  id: string
  arrangementId: string
  title: string
  author?: string | null
  arrangement: { name: string; chordproText: string }
}

interface Props {
  songs: Song[]
  initialNotes?: Record<string, string>
}

const KEYS = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
const FLAT_TO_SHARP: Record<string, string> = {
  Db: "C#", Eb: "D#", Gb: "F#", Ab: "G#", Bb: "A#",
}

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

export default function SwipeableSongbook({ songs, initialNotes = {} }: Props) {
  const [index, setIndex] = useState(0)
  const [direction, setDirection] = useState(0)
  const [transpose, setTranspose] = useState(0)
  const [fontSize, setFontSize] = useState(14)
  const [showNotes, setShowNotes] = useState(false)
  const [notes, setNotes] = useState<Record<string, string>>(initialNotes)
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle")
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const noteDragControls = useDragControls()

  // Arrow key navigation — skip when typing in textarea
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (document.activeElement?.tagName === "TEXTAREA") return
      if (e.key === "ArrowRight" && index < songs.length - 1) {
        setDirection(1)
        setIndex(index + 1)
        setTranspose(0)
      }
      if (e.key === "ArrowLeft" && index > 0) {
        setDirection(-1)
        setIndex(index - 1)
        setTranspose(0)
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [index, songs.length])

  function goNext() {
    if (index < songs.length - 1) {
      setDirection(1)
      setIndex((i) => i + 1)
      setTranspose(0)
    }
  }

  function goPrev() {
    if (index > 0) {
      setDirection(-1)
      setIndex((i) => i - 1)
      setTranspose(0)
    }
  }

  const bind = useDrag(({ swipe: [swipeX] }) => {
    if (swipeX === -1) goNext()
    if (swipeX === 1) goPrev()
  })

  function handleNoteChange(content: string) {
    const arrangementId = current.arrangementId
    setNotes((prev) => ({ ...prev, [arrangementId]: content }))
    setSaveStatus("saving")
    if (saveTimeout.current) clearTimeout(saveTimeout.current)
    saveTimeout.current = setTimeout(async () => {
      await fetch("/api/song-notes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ arrangementId, content }),
      })
      setSaveStatus("saved")
      setTimeout(() => setSaveStatus("idle"), 2000)
    }, 1000)
  }

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
    exit: (d: number) => ({ x: d > 0 ? -400 : 400, opacity: 0 }),
  }

  const currentNote = notes[current.arrangementId] ?? ""
  const hasNote = !!currentNote.trim()

  return (
    <div className="flex flex-col h-[calc(100vh-48px)]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-white">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={goPrev} disabled={index === 0}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium">
            {index + 1} / {songs.length}
          </span>
          <Button variant="ghost" size="icon" onClick={goNext} disabled={index === songs.length - 1}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Key</span>
          <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setTranspose((t) => t - 1)}>
            <Minus className="h-3 w-3" />
          </Button>
          <span className="text-sm w-8 text-center font-medium">{displayKey}</span>
          <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setTranspose((t) => t + 1)}>
            <Plus className="h-3 w-3" />
          </Button>
          <span className="text-xs text-muted-foreground ml-2">Size</span>
          <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setFontSize((f) => Math.max(10, f - 1))}>
            <Minus className="h-3 w-3" />
          </Button>
          <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setFontSize((f) => Math.min(22, f + 1))}>
            <Plus className="h-3 w-3" />
          </Button>
          {/* Notes toggle — yellow dot when notes exist */}
          <div className="relative ml-1">
            <Button
              variant={showNotes ? "default" : "outline"}
              size="icon"
              className="h-7 w-7"
              onClick={() => setShowNotes((v) => !v)}
              title="My notes"
            >
              <StickyNote className="h-3.5 w-3.5" />
            </Button>
            {hasNote && !showNotes && (
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-yellow-400 rounded-full border border-white" />
            )}
          </div>
        </div>
      </div>

      {/* Swipeable card */}
      <div ref={contentRef} className="flex-1 overflow-hidden relative" {...bind()}>
        {/* Large left arrow */}
        {index > 0 && (
          <button
            onClick={goPrev}
            onPointerDown={(e) => e.stopPropagation()}
            className="absolute left-0 top-0 bottom-0 w-14 z-10 flex items-center justify-start pl-2 bg-linear-to-r from-white/80 to-transparent hover:from-white transition-all"
            aria-label="Previous song"
          >
            <ChevronLeft className="h-9 w-9 text-gray-500" />
          </button>
        )}

        {/* Large right arrow */}
        {index < songs.length - 1 && (
          <button
            onClick={goNext}
            onPointerDown={(e) => e.stopPropagation()}
            className="absolute right-0 top-0 bottom-0 w-14 z-10 flex items-center justify-end pr-2 bg-linear-to-l from-white/80 to-transparent hover:from-white transition-all"
            aria-label="Next song"
          >
            <ChevronRight className="h-9 w-9 text-gray-500" />
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
            className="absolute inset-0 overflow-auto p-4 pl-16 pr-16"
          >
            <div className="mb-3">
              <h2 className="text-xl font-bold">{current.title}</h2>
              {current.author && <p className="text-sm text-muted-foreground">{current.author}</p>}
              <p className="text-xs text-muted-foreground">{current.arrangement.name}</p>
            </div>
            <ChordProRenderer
              chordproText={current.arrangement.chordproText}
              transpose={transpose}
              fontSize={fontSize}
            />
          </motion.div>
        </AnimatePresence>

        {/* Draggable floating notes panel */}
        {showNotes && (
          <motion.div
            key={`note-${current.arrangementId}`}
            drag
            dragControls={noteDragControls}
            dragListener={false}
            dragMomentum={false}
            dragConstraints={contentRef}
            initial={{ x: 20, y: 20 }}
            onPointerDown={(e) => e.stopPropagation()}
            className="absolute top-0 left-0 z-20 w-72 rounded-lg shadow-xl border border-yellow-200 overflow-hidden"
          >
            {/* Drag handle */}
            <div
              onPointerDown={(e) => noteDragControls.start(e)}
              className="flex items-center justify-between px-3 py-1.5 bg-yellow-100 border-b border-yellow-200 cursor-grab active:cursor-grabbing select-none"
            >
              <div className="flex items-center gap-1.5">
                <GripHorizontal className="h-3.5 w-3.5 text-yellow-600" />
                <span className="text-xs font-medium text-yellow-800">My Notes</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-yellow-600">
                  {saveStatus === "saving" ? "Saving…" : saveStatus === "saved" ? "Saved" : ""}
                </span>
                <button
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={() => setShowNotes(false)}
                  className="text-yellow-600 hover:text-yellow-900 transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            <Textarea
              className="resize-none border-0 rounded-none text-sm focus-visible:ring-0 focus-visible:ring-offset-0 bg-yellow-50 min-h-30"
              placeholder="Add personal notes for this song…"
              value={currentNote}
              onChange={(e) => handleNoteChange(e.target.value)}
              rows={5}
            />
          </motion.div>
        )}
      </div>

      {/* Dot indicator */}
      <div className="flex justify-center gap-1 py-2 shrink-0">
        {songs.map((_, i) => (
          <button
            key={i}
            onClick={() => { setDirection(i > index ? 1 : -1); setIndex(i); setTranspose(0) }}
            className={`w-2 h-2 rounded-full transition-colors ${i === index ? "bg-primary" : "bg-gray-300"}`}
          />
        ))}
      </div>
    </div>
  )
}
