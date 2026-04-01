export const dynamic = "force-dynamic"

import { db } from "@/lib/db"
import { parseSections } from "@/lib/page-blocks"
import PublicPageRenderer from "@/components/public/PublicPageRenderer"
import GiveForm from "@/components/public/GiveForm"

export default async function GivePage() {
  // Try CMS-managed content first
  const cmsPage = await db.page.findUnique({ where: { slug: "give" } })
  if (cmsPage?.published) {
    const sections = parseSections(cmsPage.content)
    if (sections.some(s => s.blocks.length > 0)) {
      return <PublicPageRenderer sections={sections} />
    }
  }

  // Fallback: default give page
  return (
    <div className="max-w-lg mx-auto px-4 py-16">
      <h1 className="text-3xl font-bold mb-2">Give</h1>
      <p className="text-muted-foreground mb-8">
        Your generosity supports our ministry and community. All giving is processed securely through Stripe.
      </p>
      <GiveForm />
    </div>
  )
}
