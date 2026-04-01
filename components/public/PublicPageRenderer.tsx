// Server-side page renderer — supports async event and give blocks.
// Use this in public page routes. The admin canvas uses PageBlockRenderer (sync/client-safe).

import type { PageBlock, PageSection, EventsBlock, GiveBlock } from "@/lib/page-blocks"
import EventsBlockContent from "./EventsBlockContent"
import GiveBlockContent from "./GiveBlockContent"

function getYouTubeEmbedUrl(url: string): string {
  try {
    const u = new URL(url)
    if (u.hostname === "youtu.be") return `https://www.youtube.com/embed/${u.pathname.slice(1)}`
    if (u.hostname.includes("youtube.com")) {
      const v = u.searchParams.get("v")
      if (v) return `https://www.youtube.com/embed/${v}`
    }
  } catch { /* not a valid URL */ }
  return url
}

function getYouTubeId(url: string): string | null {
  try {
    const u = new URL(url)
    if (u.hostname === "youtu.be") return u.pathname.slice(1)
    if (u.hostname.includes("youtube.com")) return u.searchParams.get("v")
  } catch { /* ignore */ }
  return null
}

function renderStaticBlock(block: PageBlock) {
  switch (block.type) {
    case "hero": {
      const alignClass = block.align === "center" ? "text-center items-center" : block.align === "right" ? "text-right items-end" : "text-left items-start"
      const textClass = block.textColor === "light" ? "text-white" : "text-gray-900"
      const bgStyle: React.CSSProperties = {
        backgroundColor: block.bgColor || "#111827",
        ...(block.bgImage ? { backgroundImage: `url(${block.bgImage})`, backgroundSize: "cover", backgroundPosition: "center" } : {}),
      }
      return (
        <section style={bgStyle} className={`min-h-[50vh] flex items-center ${textClass}`}>
          <div className={`w-full px-6 py-16 flex flex-col ${alignClass} gap-6`}>
            <h1 className="text-4xl md:text-6xl font-bold leading-tight">{block.heading}</h1>
            {block.subtitle && <p className="text-lg md:text-xl opacity-90 max-w-2xl">{block.subtitle}</p>}
            <div className={`flex flex-wrap gap-4 ${block.align === "center" ? "justify-center" : block.align === "right" ? "justify-end" : "justify-start"}`}>
              {block.ctaText && (
                <a href={block.ctaHref || "/"} className="bg-white text-gray-900 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors inline-block">
                  {block.ctaText}
                </a>
              )}
              {block.secondaryCtaText && (
                <a href={block.secondaryCtaHref || "/"} className="border-2 border-white text-white px-6 py-3 rounded-lg font-semibold hover:bg-white/10 transition-colors inline-block">
                  {block.secondaryCtaText}
                </a>
              )}
            </div>
          </div>
        </section>
      )
    }
    case "text": {
      const s = block.sectionBg ? { backgroundColor: block.sectionBg } : undefined
      return <section style={s} className="py-8 px-6 h-full"><div className="prose-content" dangerouslySetInnerHTML={{ __html: block.html }} /></section>
    }
    case "image": {
      const widthClass = block.width === "full" ? "w-full" : block.width === "lg" ? "max-w-4xl" : block.width === "md" ? "max-w-2xl" : "max-w-md"
      const alignClass = block.align === "center" ? "mx-auto" : block.align === "right" ? "ml-auto" : "mr-auto"
      const s = block.sectionBg ? { backgroundColor: block.sectionBg } : undefined
      return (
        <section style={s} className="py-6 px-6 h-full">
          <div className={`${widthClass} ${alignClass}`}>
            {block.src
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={block.src} alt={block.alt || ""} className={`w-full h-auto ${block.rounded ? "rounded-xl" : ""}`} />
              : <div className={`w-full h-48 bg-gray-100 flex items-center justify-center ${block.rounded ? "rounded-xl" : ""} text-gray-400 text-sm`}>No image set</div>
            }
            {block.caption && <p className="text-sm text-muted-foreground italic mt-2 text-center">{block.caption}</p>}
          </div>
        </section>
      )
    }
    case "video": {
      const embedUrl = block.url ? getYouTubeEmbedUrl(block.url) : ""
      const s = block.sectionBg ? { backgroundColor: block.sectionBg } : undefined
      return (
        <section style={s} className="py-6 px-6 h-full">
          <div className="aspect-video rounded-xl overflow-hidden bg-black">
            {embedUrl
              ? <iframe src={embedUrl} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen className="w-full h-full" title={block.caption || "Video"} />
              : <div className="w-full h-full flex items-center justify-center text-gray-500 text-sm">No video URL set</div>
            }
          </div>
          {block.caption && <p className="text-sm text-muted-foreground italic mt-2 text-center">{block.caption}</p>}
        </section>
      )
    }
    case "button": {
      const alignClass = block.align === "center" ? "text-center" : block.align === "right" ? "text-right" : "text-left"
      const variantClass = block.variant === "outline" ? "border-2 border-primary text-primary hover:bg-primary/10" : block.variant === "secondary" ? "bg-secondary text-secondary-foreground hover:bg-secondary/80" : "bg-primary text-primary-foreground hover:bg-primary/90"
      const sizeClass = block.size === "sm" ? "px-4 py-2 text-sm" : block.size === "lg" ? "px-8 py-4 text-lg" : "px-6 py-3"
      const s = block.sectionBg ? { backgroundColor: block.sectionBg } : undefined
      return (
        <section style={s} className={`py-6 px-6 h-full ${alignClass}`}>
          <a href={block.href || "/"} className={`${variantClass} ${sizeClass} rounded-lg font-semibold inline-block transition-colors`}>{block.text}</a>
        </section>
      )
    }
    case "spacer": {
      const h = block.size === "xs" ? "h-4" : block.size === "sm" ? "h-8" : block.size === "md" ? "h-16" : block.size === "lg" ? "h-24" : "h-36"
      return <div className={`${h} w-full`} />
    }
    case "divider": {
      const s = block.sectionBg ? { backgroundColor: block.sectionBg } : undefined
      return <div style={s} className="py-4 px-6 h-full flex items-center"><div className="w-full border-t border-border" /></div>
    }
    case "quote": {
      const s = block.sectionBg ? { backgroundColor: block.sectionBg } : undefined
      return (
        <section style={s} className="py-8 px-6 h-full">
          <blockquote className="border-l-4 border-primary pl-6">
            <p className="italic text-lg leading-relaxed">{block.text}</p>
            {block.author && <footer className="text-sm text-muted-foreground not-italic mt-2">&mdash; {block.author}</footer>}
          </blockquote>
        </section>
      )
    }
    case "cards": {
      const gridClass = block.columns === 2 ? "grid-cols-1 md:grid-cols-2" : block.columns === 4 ? "grid-cols-2 md:grid-cols-4" : "grid-cols-1 md:grid-cols-3"
      const s = block.sectionBg ? { backgroundColor: block.sectionBg } : undefined
      return (
        <section style={s} className="py-8 px-6 h-full">
          <div className={`grid ${gridClass} gap-6`}>
            {block.cards.map((card, i) => (
              <div key={i} className="rounded-xl border p-6 bg-card">
                {card.icon && <div className="text-2xl mb-3">{card.icon}</div>}
                <h3 className="font-semibold text-lg">{card.title}</h3>
                <p className="text-muted-foreground text-sm mt-1">{card.description}</p>
                {card.link && card.linkText && <a href={card.link} className="text-primary text-sm font-medium mt-3 inline-block hover:underline">{card.linkText} &rarr;</a>}
              </div>
            ))}
          </div>
        </section>
      )
    }
    default:
      return null
  }
}

function SectionBackground({ section, children }: { section: PageSection; children: React.ReactNode }) {
  const hasMedia = !!(section.bgImage || section.bgVideo)
  const ytId = section.bgVideo ? getYouTubeId(section.bgVideo) : null
  const isDirectVideo = section.bgVideo && !ytId
  const containerStyle: React.CSSProperties = { position: "relative", overflow: "hidden", backgroundColor: section.bg }

  if (!hasMedia) return <div style={containerStyle}>{children}</div>

  return (
    <div style={containerStyle}>
      {section.bgImage && <div style={{ position: "absolute", inset: 0, zIndex: 0, backgroundImage: `url(${section.bgImage})`, backgroundSize: "cover", backgroundPosition: "center" }} />}
      {ytId && (
        <div style={{ position: "absolute", inset: 0, zIndex: 0, overflow: "hidden", pointerEvents: "none" }}>
          <iframe src={`https://www.youtube.com/embed/${ytId}?autoplay=1&mute=1&loop=1&playlist=${ytId}&controls=0&disablekb=1&playsinline=1&rel=0`} allow="autoplay; encrypted-media"
            style={{ position: "absolute", top: "50%", left: "50%", width: "177.78vh", minWidth: "100%", height: "56.25vw", minHeight: "100%", transform: "translate(-50%,-50%)", border: "none" }} />
        </div>
      )}
      {isDirectVideo && <video autoPlay muted loop playsInline src={section.bgVideo} style={{ position: "absolute", inset: 0, zIndex: 0, width: "100%", height: "100%", objectFit: "cover", pointerEvents: "none" }} />}
      {section.bgOverlay && <div style={{ position: "absolute", inset: 0, zIndex: 1, backgroundColor: section.bgOverlay }} />}
      <div style={{ position: "relative", zIndex: 2 }}>{children}</div>
    </div>
  )
}

function renderBlock(block: PageBlock) {
  if (block.type === "events") return <EventsBlockContent block={block as EventsBlock} />
  if (block.type === "give") return <GiveBlockContent block={block as GiveBlock} />
  return renderStaticBlock(block)
}

function renderSectionBlocks(blocks: PageBlock[]) {
  if (!blocks.length) return null
  const hasGrid = blocks.some(b => b.lx > 0 || (b.lw != null && b.lw < 16))
  const sorted = [...blocks].sort((a, b) => (a.ly - b.ly) || (a.lx - b.lx))

  if (hasGrid) {
    return (
      <div className="page-grid" style={{ display: "grid", gridTemplateColumns: "repeat(16, 1fr)" }}>
        {sorted.map(block => (
          <div key={block.id} style={{ gridColumn: `${block.lx + 1} / span ${block.lw}` }}>
            {renderBlock(block)}
          </div>
        ))}
      </div>
    )
  }

  return <div>{sorted.map(block => <div key={block.id}>{renderBlock(block)}</div>)}</div>
}

export default function PublicPageRenderer({ sections }: { sections: PageSection[] }) {
  return (
    <div>
      {sections.map(section => (
        <SectionBackground key={section.id} section={section}>
          {renderSectionBlocks(section.blocks)}
        </SectionBackground>
      ))}
    </div>
  )
}
