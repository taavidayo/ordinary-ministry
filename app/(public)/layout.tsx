import PublicNav from "@/components/public/PublicNav"
import PublicFooter from "@/components/public/PublicFooter"
import { db } from "@/lib/db"
import { parseSiteStyles, siteStylesCss } from "@/lib/page-blocks"
import { parseNavConfig, buildPublicNavFromTree, navTreePageSlugs } from "@/lib/nav-config"

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const [siteStyle, navConfigRecord, settings] = await Promise.all([
    db.siteStyle.findUnique({ where: { id: "singleton" } }),
    db.navConfig.findUnique({ where: { id: "singleton" } }),
    db.ministrySetting.findUnique({ where: { id: "default" } }),
  ])

  const css = siteStyle ? siteStylesCss(parseSiteStyles(siteStyle.styles)) : ""
  const navConfig = parseNavConfig(navConfigRecord?.config ?? "{}")

  // Fetch only the pages referenced in navTree
  const referencedSlugs = navTreePageSlugs(navConfig.navTree)
  const navPages = referencedSlugs.size > 0
    ? await db.page.findMany({
        where: { slug: { in: [...referencedSlugs] } },
        select: { slug: true, title: true, navLabel: true },
      })
    : []

  const pageMap = new Map(navPages.map(p => [p.slug, { title: p.title, navLabel: p.navLabel }]))
  const navItems = buildPublicNavFromTree(navConfig.navTree, pageMap)

  const orgName = settings?.name ?? "Our Church"
  const logoUrl = settings?.logoUrl ?? null

  return (
    <div className={`flex flex-col min-h-screen${navConfig.overlay ? " relative" : ""}`}>
      {css && <style dangerouslySetInnerHTML={{ __html: css }} />}
      <PublicNav config={navConfig} items={navItems} orgName={orgName} logoUrl={logoUrl} />
      <main className="flex-1">{children}</main>
      <PublicFooter />
    </div>
  )
}
