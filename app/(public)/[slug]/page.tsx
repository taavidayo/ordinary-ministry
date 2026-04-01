export const dynamic = "force-dynamic"

import { db } from "@/lib/db"
import { notFound } from "next/navigation"
import { parseSections } from "@/lib/page-blocks"
import PublicPageRenderer from "@/components/public/PublicPageRenderer"
import type { Metadata } from "next"

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const page = await db.page.findUnique({ where: { slug }, select: { title: true } })
  return { title: page?.title ?? "Page" }
}

export default async function DynamicPage({ params }: Props) {
  const { slug } = await params

  // These slugs have dedicated route files — avoid conflict
  const dedicatedRoutes = ["about", "contact", "get-involved", "sermons", "events", "give"]
  if (dedicatedRoutes.includes(slug)) notFound()

  const page = await db.page.findUnique({ where: { slug } })

  if (!page || !page.published) notFound()

  const sections = parseSections(page.content)
  const hasContent = sections.some(s => s.blocks.length > 0)

  if (!hasContent) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16">
        <h1 className="text-3xl font-bold mb-8">{page.title}</h1>
        <p className="text-muted-foreground">This page has no content yet.</p>
      </div>
    )
  }

  return <PublicPageRenderer sections={sections} />
}
