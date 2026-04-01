import { db } from "@/lib/db"
import PagesManager from "@/components/admin/PagesManager"

export const dynamic = "force-dynamic"

export default async function AdminPagesPage() {
  const [pages, navConfigRecord, settings] = await Promise.all([
    db.page.findMany({
      select: {
        id: true, slug: true, title: true, published: true,
        navLinked: true, navOrder: true, navLabel: true, navParentSlug: true,
        metaTitle: true, metaDescription: true,
        updatedBy: true, updatedAt: true,
      },
      orderBy: { updatedAt: "desc" },
    }),
    db.navConfig.findUnique({ where: { id: "singleton" } }),
    db.ministrySetting.findUnique({ where: { id: "default" } }),
  ])

  return (
    <div>
      <PagesManager
        initialPages={pages}
        homeExists={pages.some(p => p.slug === "home")}
        initialNavConfig={navConfigRecord?.config ?? "{}"}
        initialHomeSlug={settings?.homeSlug ?? "home"}
      />
    </div>
  )
}
