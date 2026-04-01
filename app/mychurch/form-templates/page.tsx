import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import FormTemplatesManager from "@/components/admin/FormTemplatesManager"

export default async function FormTemplatesPage() {
  const session = await auth()
  const role = session?.user?.role as string
  if (role !== "ADMIN" && role !== "LEADER") redirect("/mychurch/dashboard")

  const templates = await db.formTemplate.findMany({
    include: { fields: { orderBy: { order: "asc" } }, _count: { select: { forms: true } } },
    orderBy: { createdAt: "desc" },
  })

  return <FormTemplatesManager templates={templates} />
}
