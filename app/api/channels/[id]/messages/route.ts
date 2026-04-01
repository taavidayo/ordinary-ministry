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
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  if (!(await checkAccess(id, session.user.id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const url = new URL(req.url)
  const after = url.searchParams.get("after")
  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "50", 10), 100)

  let afterDate: Date | undefined
  if (after) {
    const ref = await db.message.findUnique({ where: { id: after } })
    if (ref) afterDate = ref.createdAt
  }

  const messages = await db.message.findMany({
    where: {
      channelId: id,
      threadId: null,
      ...(afterDate ? { createdAt: { gt: afterDate } } : {}),
    },
    include: {
      author: { select: { id: true, name: true, avatar: true } },
      reactions: true,
      replies: { select: { id: true } },
    },
    orderBy: { createdAt: after ? "asc" : "desc" },
    take: limit,
  })

  const result = (after ? messages : [...messages].reverse()).map((m) => ({
    id: m.id,
    channelId: m.channelId,
    authorId: m.authorId,
    content: m.deletedAt ? "" : m.content,
    threadId: m.threadId,
    editedAt: m.editedAt,
    deletedAt: m.deletedAt,
    createdAt: m.createdAt,
    author: m.author,
    replyCount: m.replies.length,
    reactions: aggregateReactions(m.reactions),
  }))

  return NextResponse.json(result)
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  if (!(await checkAccess(id, session.user.id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { content } = await req.json()
  if (!content?.trim()) {
    return NextResponse.json({ error: "content required" }, { status: 400 })
  }

  const message = await db.message.create({
    data: { channelId: id, authorId: session.user.id, content: content.trim() },
    include: { author: { select: { id: true, name: true, avatar: true } } },
  })

  return NextResponse.json(
    {
      ...message,
      content: message.content,
      replyCount: 0,
      reactions: [],
    },
    { status: 201 }
  )
}
