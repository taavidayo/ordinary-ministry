import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import { aggregateReactions } from "@/lib/chat-utils"

async function checkAccess(channelId: string, userId: string) {
  const channel = await db.channel.findUnique({ where: { id: channelId } })
  if (!channel) return false
  if (channel.type === "PRIVATE") {
    const m = await db.channelMember.findUnique({
      where: { channelId_userId: { channelId, userId } },
    })
    return !!m
  }
  return true
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; messageId: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id, messageId } = await params
  if (!(await checkAccess(id, session.user.id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const replies = await db.message.findMany({
    where: { threadId: messageId },
    include: {
      author: { select: { id: true, name: true, avatar: true } },
      reactions: true,
    },
    orderBy: { createdAt: "asc" },
  })

  return NextResponse.json(
    replies.map((m) => ({
      id: m.id,
      channelId: m.channelId,
      authorId: m.authorId,
      content: m.deletedAt ? "" : m.content,
      threadId: m.threadId,
      editedAt: m.editedAt,
      deletedAt: m.deletedAt,
      createdAt: m.createdAt,
      author: m.author,
      reactions: aggregateReactions(m.reactions),
    }))
  )
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string; messageId: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id, messageId } = await params
  if (!(await checkAccess(id, session.user.id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { content } = await req.json()
  if (!content?.trim()) {
    return NextResponse.json({ error: "content required" }, { status: 400 })
  }

  const reply = await db.message.create({
    data: {
      channelId: id,
      authorId: session.user.id,
      content: content.trim(),
      threadId: messageId,
    },
    include: { author: { select: { id: true, name: true, avatar: true } } },
  })

  return NextResponse.json({ ...reply, reactions: [] }, { status: 201 })
}
