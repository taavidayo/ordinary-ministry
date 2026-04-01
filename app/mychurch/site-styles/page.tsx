import { db } from "@/lib/db"
import { parseSiteStyles } from "@/lib/page-blocks"
import SiteStylesEditor from "@/components/admin/SiteStylesEditor"

export const dynamic = "force-dynamic"

export default async function SiteStylesPage() {
  const row = await db.siteStyle.findUnique({ where: { id: "singleton" } })
  const styles = parseSiteStyles(row?.styles ?? "{}")

  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Site Styles</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Global typography and color settings applied across all public pages.
        </p>
      </div>
      <SiteStylesEditor initial={styles} />
    </div>
  )
}
