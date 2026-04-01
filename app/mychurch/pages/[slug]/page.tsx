import { db } from "@/lib/db"
import { notFound } from "next/navigation"
import { parseSections, defaultBlock } from "@/lib/page-blocks"
import PageBuilder from "@/components/admin/PageBuilder"

export const dynamic = "force-dynamic"

function makeDefaultHomeSections() {
  const hero = defaultBlock("hero", "home-hero", 0)
  Object.assign(hero, {
    heading: "Ordinary Ministry",
    subtitle: "A community gathered around ordinary means of grace — Word, water, bread, and wine.",
    ctaText: "Who We Are",
    ctaHref: "/about",
    secondaryCtaText: "Get Involved",
    secondaryCtaHref: "/get-involved",
  })
  const text = defaultBlock("text", "home-body", 0)
  Object.assign(text, {
    html: "<h2 style=\"text-align:center\">Join Us Sundays</h2><p style=\"text-align:center\">Sundays at 10:00 AM · 123 Church St, Your City</p>",
  })
  return [{ id: "section-home-1", blocks: [hero] }, { id: "section-home-2", blocks: [text] }]
}

function makeDefaultEventsSections() {
  const block = defaultBlock("events", "events-block", 0)
  return [{ id: "section-events-1", blocks: [block] }]
}

function makeDefaultGiveSections() {
  const block = defaultBlock("give", "give-block", 0)
  return [{ id: "section-give-1", blocks: [block] }]
}

function makeDefaultSimpleSections(heading: string) {
  const hero = defaultBlock("hero", `${heading}-hero`, 0)
  Object.assign(hero, { heading, subtitle: "", ctaText: "", secondaryCtaText: "" })
  return [{ id: `section-${heading}-1`, blocks: [hero] }]
}

// System pages that auto-create when first opened in the admin editor
const SYSTEM_PAGE_DEFAULTS: Record<string, { title: string; sections: () => object[] }> = {
  home: { title: "Home", sections: makeDefaultHomeSections },
  events: { title: "Events", sections: makeDefaultEventsSections },
  give: { title: "Give", sections: makeDefaultGiveSections },
  about: { title: "About", sections: () => makeDefaultSimpleSections("About") },
  sermons: { title: "Sermons", sections: () => makeDefaultSimpleSections("Sermons") },
  contact: { title: "Contact", sections: () => makeDefaultSimpleSections("Contact") },
  "get-involved": { title: "Get Involved", sections: () => makeDefaultSimpleSections("Get Involved") },
}

export default async function AdminPageEditorPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  let page = await db.page.findUnique({ where: { slug }, select: { slug: true, title: true, content: true, published: true, navLabel: true } })

  if (!page) {
    const systemDef = SYSTEM_PAGE_DEFAULTS[slug]
    if (systemDef) {
      page = await db.page.create({
        data: {
          slug,
          title: systemDef.title,
          content: JSON.stringify({ sections: systemDef.sections() }),
          published: true,
        },
        select: { slug: true, title: true, content: true, published: true, navLabel: true },
      })
    }
  }

  if (!page) notFound()

  const sections = parseSections(page.content)

  return (
    <PageBuilder
      initialSections={sections}
      initialTitle={page.title}
      initialSlug={page.slug}
      initialPublished={page.published}
      initialNavLabel={page.navLabel ?? ""}
    />
  )
}
