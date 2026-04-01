export const dynamic = "force-dynamic"

import { db } from "@/lib/db"
import { parseSections } from "@/lib/page-blocks"
import PublicPageRenderer from "@/components/public/PublicPageRenderer"

export default async function AboutPage() {
  const page = await db.page.findUnique({ where: { slug: "about" } })
  if (page?.published) {
    const sections = parseSections(page.content)
    if (sections.some(s => s.blocks.length > 0)) {
      return <PublicPageRenderer sections={sections} />
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-16">
      <h1 className="text-3xl font-bold mb-8">{page?.title ?? "About Us"}</h1>
      <p className="text-muted-foreground">
        We are a local church gathered around the ordinary means of grace — the preaching of God&apos;s Word,
        baptism, and the Lord&apos;s Supper. We believe that it is through these ordinary things that God
        does his extraordinary work in the lives of his people.
      </p>
    </div>
  )
}
