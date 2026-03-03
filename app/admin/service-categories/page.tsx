import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import ServiceCategoryManager from "@/components/admin/ServiceCategoryManager"

export default async function ServiceCategoriesPage() {
  const session = await auth()
  if ((session?.user?.role as string) !== "ADMIN") redirect("/admin/services")

  const categories = await db.serviceCategory.findMany({
    orderBy: [{ order: "asc" }, { name: "asc" }],
    include: { _count: { select: { services: true } } },
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link
          href="/admin/services"
          className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
        >
          <ChevronLeft className="h-4 w-4" /> Services
        </Link>
        <h1 className="text-2xl font-bold">Service Categories</h1>
      </div>
      <p className="text-sm text-muted-foreground">
        Categories group your services and control which roles can see them. Members only see categories
        marked <strong>All Members</strong>; leaders see theirs plus <strong>Leaders &amp; Admins</strong>;
        admins see everything.
      </p>
      <ServiceCategoryManager initialCategories={categories} />
    </div>
  )
}
