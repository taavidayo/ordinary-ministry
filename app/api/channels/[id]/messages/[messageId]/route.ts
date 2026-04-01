import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; messageId: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { messageId } = await params
  const message = await db.message.findUnique({ where: { id: messageId } })
  if (!message) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (message.authorId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { content } = await req.json()
  const updated = await db.message.update({
    where: { id: messageId },
    data: { content, editedAt: new Date() },
    include: { author: { select: { id: true, name: true, avatar: true } } },
  })

  return NextResponse.json({ ...updated, reactions: [] })
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; messageId: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { messageId } = await params
  const message = await db.message.findUnique({ where: { id: messageId } })
  if (!message) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const isAdmin = session.user.role === "ADMIN"
  if (message.authorId !== session.user.id && !isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  await db.message.update({
    where: { id: messageId },
    data: { deletedAt: new Date(), content: "" },
  })

  return new NextResponse(null, { status: 204 })
}
