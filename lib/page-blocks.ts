// Shared block types for the page builder
// All blocks carry lx/ly/lw/lh grid position fields (16-column grid, rowHeight=30px)

export type BlockType =
  | "hero"
  | "text"
  | "image"
  | "video"
  | "button"
  | "spacer"
  | "divider"
  | "quote"
  | "cards"
  | "events"
  | "give"

// Grid layout fields embedded in every block
export interface BlockGrid {
  lx: number   // 0–15  column start
  ly: number   // row start
  lw: number   // 1–16  column span
  lh: number   // height in row units (1 unit = 30px in admin canvas)
  pinned?: boolean  // if true, block is locked in place
}

export interface HeroBlock extends BlockGrid {
  id: string; type: "hero"
  heading: string; subtitle: string
  ctaText: string; ctaHref: string
  secondaryCtaText: string; secondaryCtaHref: string
  align: "left" | "center" | "right"
  bgColor: string; textColor: "light" | "dark"
  bgImage: string
}

export interface TextBlock extends BlockGrid {
  id: string; type: "text"
  html: string
  sectionBg?: string
  letterSpacing?: string   // e.g. "0.05em", "2px"
  rotate?: number          // degrees, e.g. -5, 0, 45
}

export interface ImageBlock extends BlockGrid {
  id: string; type: "image"
  src: string; alt: string; caption: string
  width: "full" | "lg" | "md" | "sm"
  align: "left" | "center" | "right"
  rounded: boolean
  sectionBg?: string
}

export interface VideoBlock extends BlockGrid {
  id: string; type: "video"
  url: string; caption: string
  sectionBg?: string
}

export interface ButtonBlock extends BlockGrid {
  id: string; type: "button"
  text: string; href: string
  variant: "default" | "outline" | "secondary"
  align: "left" | "center" | "right"
  size: "sm" | "default" | "lg"
  sectionBg?: string
}

export interface SpacerBlock extends BlockGrid {
  id: string; type: "spacer"
  size: "xs" | "sm" | "md" | "lg" | "xl"
}

export interface DividerBlock extends BlockGrid {
  id: string; type: "divider"
  sectionBg?: string
}

export interface QuoteBlock extends BlockGrid {
  id: string; type: "quote"
  text: string; author: string
  sectionBg?: string
}

export interface CardsBlock extends BlockGrid {
  id: string; type: "cards"
  cards: { title: string; description: string; icon: string; link: string; linkText: string }[]
  columns: 2 | 3 | 4
  sectionBg?: string
}

export interface EventsBlock extends BlockGrid {
  id: string; type: "events"
  heading: string
  maxCount: number   // 0 = show all upcoming
  layout: "list" | "grid"
  sectionBg?: string
}

export interface GiveBlock extends BlockGrid {
  id: string; type: "give"
  heading: string
  description: string
  sectionBg?: string
}

export type PageBlock =
  | HeroBlock | TextBlock | ImageBlock | VideoBlock
  | ButtonBlock | SpacerBlock | DividerBlock | QuoteBlock | CardsBlock
  | EventsBlock | GiveBlock

// Default height (in row units, 1 unit = 30px) per block type
export const DEFAULT_LH: Record<BlockType, number> = {
  hero: 16,
  text: 8,
  image: 11,
  video: 12,
  button: 3,
  spacer: 3,
  divider: 2,
  quote: 6,
  cards: 14,
  events: 20,
  give: 16,
}

export function defaultBlock(type: BlockType, uid: string, appendY = 0): PageBlock {
  const grid: BlockGrid = { lx: 0, ly: appendY, lw: 16, lh: DEFAULT_LH[type] }
  switch (type) {
    case "hero":    return { ...grid, id: uid, type: "hero", heading: "Welcome", subtitle: "A subtitle for your page.", ctaText: "Get Started", ctaHref: "/contact", secondaryCtaText: "", secondaryCtaHref: "", align: "center", bgColor: "#111827", textColor: "light", bgImage: "" }
    case "text":    return { ...grid, id: uid, type: "text", html: "<p>Add your content here.</p>" }
    case "image":   return { ...grid, id: uid, type: "image", src: "", alt: "", caption: "", width: "full", align: "center", rounded: true }
    case "video":   return { ...grid, id: uid, type: "video", url: "", caption: "" }
    case "button":  return { ...grid, id: uid, type: "button", text: "Click Here", href: "/", variant: "default", align: "center", size: "default" }
    case "spacer":  return { ...grid, id: uid, type: "spacer", size: "md" }
    case "divider": return { ...grid, id: uid, type: "divider" }
    case "quote":   return { ...grid, id: uid, type: "quote", text: "Enter a memorable quote here.", author: "" }
    case "cards":   return { ...grid, id: uid, type: "cards", cards: [{ title: "Card One", description: "A short description.", icon: "", link: "", linkText: "" }, { title: "Card Two", description: "A short description.", icon: "", link: "", linkText: "" }], columns: 3 }
    case "events":  return { ...grid, id: uid, type: "events", heading: "Upcoming Events", maxCount: 0, layout: "list" }
    case "give":    return { ...grid, id: uid, type: "give", heading: "Give", description: "Your generosity supports our ministry and community. All giving is processed securely through Stripe." }
  }
}

export function parseBlocks(content: string): PageBlock[] {
  try {
    const parsed = JSON.parse(content)
    if (Array.isArray(parsed)) return parsed
  } catch {
    // not valid JSON
  }
  return []
}

// ─── Page sections ────────────────────────────────────────────────────────────

export interface PageSection {
  id: string
  bg?: string           // background hex color
  bgImage?: string      // background image URL
  bgVideo?: string      // YouTube URL or direct video URL
  bgOverlay?: string    // overlay color e.g. "rgba(0,0,0,0.4)"
  rowHeight?: number    // RGL row unit in px, default 30
  gap?: number          // gap between blocks in px, default 0
  cols?: number         // grid columns, default 16, max 20
  minHeight?: number    // minimum section height in px
  blocks: PageBlock[]
}

/** Parse page content as sections. Handles both the new { sections: [] } format
 *  and the legacy flat PageBlock[] format (wraps in a single section). */
export function parseSections(content: string): PageSection[] {
  try {
    const parsed = JSON.parse(content)
    // New format: { sections: [...] }
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed) && Array.isArray(parsed.sections)) {
      return parsed.sections as PageSection[]
    }
    // Legacy format: flat array of blocks → wrap in one default section
    if (Array.isArray(parsed) && parsed.length > 0) {
      return [{ id: "section-default", blocks: parsed as PageBlock[] }]
    }
  } catch { /* ignore */ }
  return [{ id: "section-0", blocks: [] }]
}

// ─── Site style types ─────────────────────────────────────────────────────────

export interface SiteStyleConfig {
  headingFont?: string   // CSS font-family
  bodyFont?: string
  h1Size?: string        // CSS length e.g. "2.5rem"
  h1Weight?: string      // CSS weight e.g. "700"
  h2Size?: string
  h2Weight?: string
  h3Size?: string
  h3Weight?: string
  bodySize?: string
  bodyLineHeight?: string
  primaryColor?: string    // hex
  secondaryColor?: string  // hex
  tertiaryColor?: string   // hex
}

export function parseSiteStyles(json: string): SiteStyleConfig {
  try { return JSON.parse(json) } catch { return {} }
}

export function siteStylesCss(s: SiteStyleConfig): string {
  const v = (k: string, val?: string) => val ? `  ${k}: ${val};\n` : ""
  return `:root {\n`
    + v("--site-heading-font", s.headingFont)
    + v("--site-body-font", s.bodyFont)
    + v("--site-h1-size", s.h1Size)
    + v("--site-h1-weight", s.h1Weight)
    + v("--site-h2-size", s.h2Size)
    + v("--site-h2-weight", s.h2Weight)
    + v("--site-h3-size", s.h3Size)
    + v("--site-h3-weight", s.h3Weight)
    + v("--site-body-size", s.bodySize)
    + v("--site-body-line-height", s.bodyLineHeight)
    + v("--site-primary", s.primaryColor)
    + v("--site-secondary", s.secondaryColor)
    + v("--site-tertiary", s.tertiaryColor)
    + `}`
}
