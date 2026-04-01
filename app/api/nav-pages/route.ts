import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"

export const dynamic = "force-dynamic"

export async function GET() {
  const pages = await db.page.findMany({
    where: { navLinked: true },
    select: { slug: true, title: true, navLabel: true, navOrder: true, navParentSlug: true },
    orderBy: { navOrder: "asc" },
  })
  return NextResponse.json(pages)
}

export async function PATCH(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { updates } = await req.json() as {
    updates: {
      slug: string
      navLinked: boolean
      navOrder: number
      navLabel?: string | null
      navParentSlug?: string | null
    }[]
  }

  await Promise.all(updates.map(u =>
    db.page.update({
      where: { slug: u.slug },
      data: {
        navLinked: u.navLinked,
        navOrder: u.navOrder,
        navLabel: u.navLabel ?? null,
        navParentSlug: u.navParentSlug ?? null,
      },
    })
  ))

  return NextResponse.json({ ok: true })
}
