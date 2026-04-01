import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"

export const dynamic = "force-dynamic"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const page = await db.page.findUnique({ where: { slug } })
  if (!page) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json(page)
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { slug } = await params
  const body = await req.json()

  const page = await db.page.findUnique({ where: { slug } })
  if (!page) return NextResponse.json({ error: "Not found" }, { status: 404 })

  // Check slug uniqueness if changing
  if (body.slug && body.slug !== slug) {
    const conflict = await db.page.findUnique({ where: { slug: body.slug } })
    if (conflict) return NextResponse.json({ error: "A page with that slug already exists" }, { status: 409 })
  }

  const updated = await db.page.update({
    where: { slug },
    data: {
      ...(body.title !== undefined && { title: body.title }),
      ...(body.slug !== undefined && { slug: body.slug }),
      ...(body.content !== undefined && { content: body.content }),
      ...(body.published !== undefined && { published: body.published }),
      ...(body.navLinked !== undefined && { navLinked: body.navLinked }),
      ...(body.navOrder !== undefined && { navOrder: body.navOrder }),
      ...(body.navLabel !== undefined && { navLabel: body.navLabel }),
      ...(body.navParentSlug !== undefined && { navParentSlug: body.navParentSlug }),
      ...(body.metaTitle !== undefined && { metaTitle: body.metaTitle || null }),
      ...(body.metaDescription !== undefined && { metaDescription: body.metaDescription || null }),
      updatedBy: session.user?.name ?? session.user?.email ?? null,
    },
  })
  return NextResponse.json(updated)
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { slug } = await params
  await db.page.delete({ where: { slug } })
  return NextResponse.json({ ok: true })
}
