import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const { id } = await params
    const { title, content, categoryId, tags, archivedAt } = await req.json()
    const data: Record<string, unknown> = {}
    if (title !== undefined) data.title = title.trim()
    if (content !== undefined) data.content = content.trim()
    if (categoryId !== undefined) data.categoryId = categoryId || null
    if (tags !== undefined) data.tags = Array.isArray(tags) ? tags : []
    if (archivedAt !== undefined) data.archivedAt = archivedAt ? new Date(archivedAt) : null

    const broadcast = await db.groupBroadcast.update({
      where: { id },
      data,
      include: { author: { select: { id: true, name: true, avatar: true } }, category: { select: { id: true, name: true } } },
    })
    return NextResponse.json(broadcast)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const { id } = await params
    await db.groupBroadcast.delete({ where: { id } })
    return new NextResponse(null, { status: 204 })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
