// Minimal YouTube InnerTube client — no API key required.
// Uses the same internal API that youtube.com itself uses.

const INNERTUBE_URL = "https://www.youtube.com/youtubei/v1/browse"

const CLIENT_CONTEXT = {
  client: {
    clientName: "WEB",
    clientVersion: "2.20240101.00.00",
  },
}

// Safe deep-property accessor
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function dig(obj: unknown, ...keys: string[]): any {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let cur: any = obj
  for (const k of keys) {
    if (cur == null || typeof cur !== "object") return undefined
    cur = cur[k]
  }
  return cur
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getText(obj: any): string {
  if (!obj) return ""
  if (typeof obj === "string") return obj
  if (obj.simpleText) return obj.simpleText
  if (Array.isArray(obj.runs)) return obj.runs.map((r: { text: string }) => r.text).join("")
  return ""
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getBestThumbnail(thumbnails: any[]): string | null {
  if (!Array.isArray(thumbnails) || thumbnails.length === 0) return null
  // Prefer highest resolution
  const sorted = [...thumbnails].sort((a, b) => (b.width ?? 0) - (a.width ?? 0))
  return sorted[0]?.url ?? null
}

async function innerTubeBrowse(browseId: string, continuation?: string) {
  const body = continuation
    ? { context: CLIENT_CONTEXT, continuation }
    : { context: CLIENT_CONTEXT, browseId }

  const res = await fetch(INNERTUBE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })

  if (!res.ok) throw new Error(`InnerTube request failed: ${res.status}`)
  return res.json()
}

export interface PlaylistInfo {
  id: string
  title: string
  thumbnail: string | null
  videoCount: number
}

export interface PlaylistItem {
  id: string
  title: string
  thumbnail: string | null
}

export async function fetchPlaylistInfo(playlistId: string): Promise<PlaylistInfo> {
  const data = await innerTubeBrowse(`VL${playlistId}`)

  const header = dig(data, "header", "playlistHeaderRenderer")
  const title = getText(header?.title) || "Unknown Playlist"
  const thumbnail =
    getBestThumbnail(dig(header, "playlistHeaderBanner", "heroPlaylistThumbnailRenderer", "thumbnail", "thumbnails")) ??
    getBestThumbnail(dig(header, "thumbnail", "thumbnails"))

  // Video count from header stats
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stats: any[] = header?.stats ?? []
  let videoCount = 0
  for (const stat of stats) {
    const text = getText(stat)
    const match = text.replace(/,/g, "").match(/(\d+)/)
    if (match) {
      videoCount = parseInt(match[1], 10)
      break
    }
  }

  // Fallback: count items in the first page
  if (videoCount === 0) {
    const items = extractItemsFromData(data)
    videoCount = items.length
  }

  return { id: playlistId, title, thumbnail, videoCount }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractItemsFromData(data: any): PlaylistItem[] {
  const items: PlaylistItem[] = []

  // Primary path: tabs → tabRenderer → content → sectionListRenderer → contents → itemSectionRenderer → contents → playlistVideoListRenderer → contents
  const tabs = dig(data, "contents", "twoColumnBrowseResultsRenderer", "tabs") ?? []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const tab of tabs) {
    const contents = dig(tab, "tabRenderer", "content", "sectionListRenderer", "contents") ?? []
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const section of contents) {
      const videoList =
        dig(section, "itemSectionRenderer", "contents", 0, "playlistVideoListRenderer", "contents") ??
        dig(section, "playlistVideoListRenderer", "contents") ??
        []
      parseVideoRenderers(videoList, items)
    }
  }

  // Continuation path
  const continuationItems =
    dig(data, "onResponseReceivedActions", 0, "appendContinuationItemsAction", "continuationItems") ?? []
  parseVideoRenderers(continuationItems, items)

  return items
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseVideoRenderers(list: any[], out: PlaylistItem[]) {
  for (const entry of list) {
    const r = entry?.playlistVideoRenderer
    if (!r || !r.videoId) continue
    out.push({
      id: r.videoId,
      title: getText(r.title) || "Untitled",
      thumbnail: getBestThumbnail(dig(r, "thumbnail", "thumbnails")),
    })
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractContinuation(data: any): string | undefined {
  // From tabs path
  const tabs = dig(data, "contents", "twoColumnBrowseResultsRenderer", "tabs") ?? []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const tab of tabs) {
    const contents = dig(tab, "tabRenderer", "content", "sectionListRenderer", "contents") ?? []
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const section of contents) {
      const videoList =
        dig(section, "itemSectionRenderer", "contents", 0, "playlistVideoListRenderer", "contents") ??
        dig(section, "playlistVideoListRenderer", "contents") ??
        []
      const cont = findContinuation(videoList)
      if (cont) return cont
    }
  }
  // From continuation path
  const continuationItems =
    dig(data, "onResponseReceivedActions", 0, "appendContinuationItemsAction", "continuationItems") ?? []
  return findContinuation(continuationItems)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function findContinuation(list: any[]): string | undefined {
  for (const entry of list) {
    const token = dig(entry, "continuationItemRenderer", "continuationEndpoint", "continuationCommand", "token")
    if (token) return token
  }
}

export async function fetchPlaylistItems(playlistId: string): Promise<PlaylistItem[]> {
  const all: PlaylistItem[] = []
  let data = await innerTubeBrowse(`VL${playlistId}`)
  all.push(...extractItemsFromData(data))

  let continuation = extractContinuation(data)
  while (continuation) {
    data = await innerTubeBrowse(`VL${playlistId}`, continuation)
    const page = extractItemsFromData(data)
    if (page.length === 0) break
    all.push(...page)
    continuation = extractContinuation(data)
  }

  return all
}
