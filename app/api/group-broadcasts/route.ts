import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const categoryId = searchParams.get("categoryId") // null = fetch all; "none" = global only
    const showArchived = searchParams.get("archived") === "true"

    const categoryWhere = categoryId === "none"
      ? { categoryId: null }
      : categoryId
        ? { OR: [{ categoryId }, { categoryId: null }] }
        : {}

    const where = {
      ...categoryWhere,
      archivedAt: showArchived ? { not: null } : null,
    }

    const broadcasts = await db.groupBroadcast.findMany({
      where,
      include: { author: { select: { id: true, name: true, avatar: true } }, category: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
    })
    return NextResponse.json(broadcasts)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const { title, content, categoryId, tags } = await req.json()
    if (!title?.trim() || !content?.trim()) return NextResponse.json({ error: "Title and content required" }, { status: 400 })

    const broadcast = await db.groupBroadcast.create({
      data: {
        title: title.trim(),
        content: content.trim(),
        categoryId: categoryId || null,
        authorId: session.user.id,
        tags: Array.isArray(tags) ? tags : [],
      },
      include: { author: { select: { id: true, name: true, avatar: true } }, category: { select: { id: true, name: true } } },
    })
    return NextResponse.json(broadcast, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
