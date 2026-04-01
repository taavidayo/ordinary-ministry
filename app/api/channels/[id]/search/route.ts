import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import { aggregateReactions } from "@/lib/chat-utils"

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const url = new URL(req.url)
  const q = url.searchParams.get("q")?.trim()
  if (!q) return NextResponse.json([])

  const messages = await db.message.findMany({
    where: {
      channelId: id,
      deletedAt: null,
      content: { contains: q, mode: "insensitive" },
    },
    include: {
      author: { select: { id: true, name: true, avatar: true } },
      reactions: true,
    },
    orderBy: { createdAt: "desc" },
    take: 30,
  })

  return NextResponse.json(
    messages.map((m) => ({
      id: m.id,
      channelId: m.channelId,
      authorId: m.authorId,
      content: m.content,
      threadId: m.threadId,
      editedAt: m.editedAt,
      deletedAt: m.deletedAt,
      createdAt: m.createdAt,
      author: m.author,
      replyCount: 0,
      reactions: aggregateReactions(m.reactions),
    }))
  )
}
