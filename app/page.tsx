export const dynamic = "force-dynamic"

import { redirect } from "next/navigation"
import { db } from "@/lib/db"

export default async function Root() {
  const settings = await db.ministrySetting.findUnique({ where: { id: "default" } })
  const homeSlug = settings?.homeSlug ?? "home"
  redirect(`/${homeSlug}`)
}
