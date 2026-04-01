import { NextResponse } from "next/server"

const BOOK_MAP: Record<string, number> = {
  genesis:1,gen:1,ge:1,gn:1,
  exodus:2,ex:2,exo:2,
  leviticus:3,lev:3,le:3,lv:3,
  numbers:4,num:4,nu:4,nm:4,
  deuteronomy:5,deut:5,dt:5,
  joshua:6,josh:6,jos:6,
  judges:7,judg:7,jdg:7,
  ruth:8,
  "1samuel":9,"1sam":9,"1sa":9,
  "2samuel":10,"2sam":10,"2sa":10,
  "1kings":11,"1kgs":11,"1ki":11,
  "2kings":12,"2kgs":12,"2ki":12,
  "1chronicles":13,"1chron":13,"1chr":13,"1ch":13,
  "2chronicles":14,"2chron":14,"2chr":14,"2ch":14,
  ezra:15,
  nehemiah:16,neh:16,ne:16,
  esther:17,esth:17,es:17,
  job:18,
  psalms:19,psalm:19,ps:19,psa:19,
  proverbs:20,prov:20,pr:20,
  ecclesiastes:21,eccles:21,eccl:21,ec:21,
  "songofsolomon":22,"songofsongs":22,songs:22,sos:22,ss:22,
  isaiah:23,isa:23,
  jeremiah:24,jer:24,je:24,
  lamentations:25,lam:25,la:25,
  ezekiel:26,ezek:26,eze:26,
  daniel:27,dan:27,da:27,
  hosea:28,hos:28,ho:28,
  joel:29,joe:29,
  amos:30,
  obadiah:31,obad:31,ob:31,
  jonah:32,jon:32,
  micah:33,mic:33,
  nahum:34,nah:34,na:34,
  habakkuk:35,hab:35,
  zephaniah:36,zeph:36,zep:36,
  haggai:37,hag:37,
  zechariah:38,zech:38,zec:38,
  malachi:39,mal:39,
  matthew:40,matt:40,mt:40,
  mark:41,mk:41,mr:41,
  luke:42,lk:42,
  john:43,jn:43,
  acts:44,ac:44,
  romans:45,rom:45,ro:45,
  "1corinthians":46,"1cor":46,"1co":46,
  "2corinthians":47,"2cor":47,"2co":47,
  galatians:48,gal:48,ga:48,
  ephesians:49,eph:49,
  philippians:50,phil:50,php:50,
  colossians:51,col:51,
  "1thessalonians":52,"1thess":52,"1th":52,
  "2thessalonians":53,"2thess":53,"2th":53,
  "1timothy":54,"1tim":54,"1ti":54,
  "2timothy":55,"2tim":55,"2ti":55,
  titus:56,
  philemon:57,phlm:57,phm:57,
  hebrews:58,heb:58,
  james:59,jas:59,
  "1peter":60,"1pet":60,"1pe":60,"1pt":60,
  "2peter":61,"2pet":61,"2pe":61,"2pt":61,
  "1john":62,"1jn":62,"1jo":62,
  "2john":63,"2jn":63,"2jo":63,
  "3john":64,"3jn":64,"3jo":64,
  jude:65,jud:65,
  revelation:66,rev:66,re:66,
}

function parseRef(ref: string): { book: number; chapter: number; verseStart: number; verseEnd: number; label: string } | null {
  const normalised = ref.trim()
    .replace(/\s+of\s+/gi, "of")
    .toLowerCase()
    .replace(/[^a-z0-9:\-\s]/g, "")
    .trim()

  const m = normalised.match(/^(\d?\s*[a-z]+(?:of[a-z]+)?)\s+(\d+):(\d+)(?:-(\d+))?$/)
  if (!m) return null

  const bookKey = m[1].replace(/\s+/g, "")
  const book = BOOK_MAP[bookKey]
  if (!book) return null

  const chapter = parseInt(m[2])
  const verseStart = parseInt(m[3])
  const verseEnd = m[4] ? parseInt(m[4]) : verseStart

  // Build a clean label using the original book name from the input
  const originalWords = ref.trim().split(/\s+/)
  // Book name = all words except the last (chapter:verse)
  const bookLabel = originalWords.slice(0, -1).join(" ")
  const label = verseEnd > verseStart
    ? `${bookLabel} ${chapter}:${verseStart}–${verseEnd}`
    : `${bookLabel} ${chapter}:${verseStart}`

  return { book, chapter, verseStart, verseEnd, label }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const ref = searchParams.get("ref") ?? ""
  const version = searchParams.get("version") ?? "ESV"

  if (!ref.trim()) {
    return NextResponse.json({ error: "No reference provided" }, { status: 400 })
  }

  const parsed = parseRef(ref)
  if (!parsed) {
    return NextResponse.json({ error: "Could not parse reference. Try 'John 3:16' or 'Romans 8:28-30'." }, { status: 400 })
  }

  const { book, chapter, verseStart, verseEnd, label } = parsed
  const limit = Math.min(verseEnd, verseStart + 19) // max 20 verses

  try {
    // bolls.life returns a full chapter; fetch once then filter by verse number
    const res = await fetch(`https://bolls.life/get-text/${version}/${book}/${chapter}/`, {
      headers: { "Accept": "application/json" },
      next: { revalidate: 86400 }, // cache chapters for 24h
    })
    if (!res.ok) {
      return NextResponse.json({ error: `Chapter not found (${res.status})` }, { status: 404 })
    }
    const chapterVerses: { verse: number; text: string }[] = await res.json()
    if (!Array.isArray(chapterVerses) || chapterVerses.length === 0) {
      return NextResponse.json({ error: "Chapter not found" }, { status: 404 })
    }

    const collected: string[] = []
    for (let v = verseStart; v <= limit; v++) {
      const found = chapterVerses.find((row) => row.verse === v)
      if (!found) {
        return NextResponse.json({ error: `Verse ${v} not found` }, { status: 404 })
      }
      // Strip any HTML tags bolls.life occasionally includes
      collected.push(found.text.replace(/<[^>]+>/g, "").trim())
    }

    return NextResponse.json({ text: collected.join(" "), reference: label })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
