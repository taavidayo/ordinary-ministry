"use client"

import { useMemo } from "react"
import ChordSheetJS from "chordsheetjs"

interface Props {
  chordproText: string
  transpose?: number
  fontSize?: number
}

export default function ChordProRenderer({ chordproText, transpose = 0, fontSize = 14 }: Props) {
  const rendered = useMemo(() => {
    try {
      const parser = new ChordSheetJS.ChordProParser()
      let song = parser.parse(chordproText)
      if (transpose !== 0) {
        song = song.transpose(transpose)
      }
      return song.lines
    } catch {
      return null
    }
  }, [chordproText, transpose])

  if (!rendered) {
    return <pre className="whitespace-pre-wrap font-mono text-sm">{chordproText}</pre>
  }

  return (
    <div className="font-mono" style={{ fontSize }}>
      {rendered.map((line, li) => {
        const hasChords = line.items.some(
          (item) => item instanceof ChordSheetJS.ChordLyricsPair && item.chords
        )
        return (
          <div key={li} className="mb-1">
            {line.items.map((item, ii) => {
              if (item instanceof ChordSheetJS.ChordLyricsPair) {
                return (
                  <span key={ii} className="inline-block mr-0.5">
                    {hasChords && (
                      <span className="block text-blue-600 font-semibold leading-tight">
                        {item.chords || "\u00A0"}
                      </span>
                    )}
                    <span className="block leading-tight">{item.lyrics || "\u00A0"}</span>
                  </span>
                )
              }
              if (item instanceof ChordSheetJS.Tag) {
                return (
                  <div key={ii} className="text-gray-500 italic text-xs my-1">
                    [{item.name}
                    {item.value ? `: ${item.value}` : ""}]
                  </div>
                )
              }
              return null
            })}
          </div>
        )
      })}
    </div>
  )
}
