import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get("q")?.trim() ?? ""
  const limit = Math.min(Number(searchParams.get("limit") ?? "50"), 50)

  const pages = await db.page.findMany({
    where: q ? {
      OR: [
        { title: { contains: q, mode: "insensitive" } },
        { slug:  { contains: q, mode: "insensitive" } },
      ],
    } : undefined,
    select: { id: true, slug: true, title: true, published: true, updatedAt: true },
    orderBy: { updatedAt: "desc" },
    take: limit,
  })
  return NextResponse.json(pages)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { title, slug } = await req.json()
  if (!title || !slug) {
    return NextResponse.json({ error: "title and slug are required" }, { status: 400 })
  }

  try {
    const page = await db.page.create({
      data: { title, slug, content: "[]", published: true },
    })
    return NextResponse.json(page, { status: 201 })
  } catch {
    return NextResponse.json({ error: "Slug already exists" }, { status: 409 })
  }
}
