import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import { aggregateReactions } from "@/lib/chat-utils"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params

  const pins = await db.channelPin.findMany({
    where: { channelId: id },
    include: {
      message: {
        include: {
          author: { select: { id: true, name: true, avatar: true } },
          reactions: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json(
    pins.map((p) => ({
      channelId: p.channelId,
      messageId: p.messageId,
      pinnedById: p.pinnedById,
      createdAt: p.createdAt,
      message: {
        id: p.message.id,
        channelId: p.message.channelId,
        authorId: p.message.authorId,
        content: p.message.deletedAt ? "" : p.message.content,
        threadId: p.message.threadId,
        editedAt: p.message.editedAt,
        deletedAt: p.message.deletedAt,
        createdAt: p.message.createdAt,
        author: p.message.author,
        reactions: aggregateReactions(p.message.reactions),
      },
    }))
  )
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const { messageId } = await req.json()
  if (!messageId) return NextResponse.json({ error: "messageId required" }, { status: 400 })

  await db.channelPin.upsert({
    where: { channelId_messageId: { channelId: id, messageId } },
    create: { channelId: id, messageId, pinnedById: session.user.id },
    update: {},
  })

  return NextResponse.json({ ok: true })
}
