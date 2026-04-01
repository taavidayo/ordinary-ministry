export const dynamic = "force-dynamic"

import { db } from "@/lib/db"
import { parseSections } from "@/lib/page-blocks"
import PublicPageRenderer from "@/components/public/PublicPageRenderer"

export default async function ContactPage() {
  const page = await db.page.findUnique({ where: { slug: "contact" } })
  if (page?.published) {
    const sections = parseSections(page.content)
    if (sections.some(s => s.blocks.length > 0)) {
      return <PublicPageRenderer sections={sections} />
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-16">
      <h1 className="text-3xl font-bold mb-4">{page?.title ?? "Contact"}</h1>
      <p className="text-muted-foreground mb-8">
        We&apos;d love to hear from you. Reach out and we&apos;ll get back to you soon.
      </p>
      <div className="border rounded-lg p-6 space-y-2">
        <p className="font-medium">Ordinary Ministry</p>
        <p className="text-muted-foreground">123 Church Street</p>
        <p className="text-muted-foreground">Your City, State 12345</p>
        <p className="text-muted-foreground">info@ordinaryministry.com</p>
      </div>
    </div>
  )
}
