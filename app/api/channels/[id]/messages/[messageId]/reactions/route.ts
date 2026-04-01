import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string; messageId: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { messageId } = await params
  const { emoji } = await req.json()
  if (!emoji) return NextResponse.json({ error: "emoji required" }, { status: 400 })

  const existing = await db.messageReaction.findUnique({
    where: {
      messageId_userId_emoji: {
        messageId,
        userId: session.user.id,
        emoji,
      },
    },
  })

  if (existing) {
    await db.messageReaction.delete({
      where: {
        messageId_userId_emoji: {
          messageId,
          userId: session.user.id,
          emoji,
        },
      },
    })
    return NextResponse.json({ action: "removed" })
  } else {
    await db.messageReaction.create({
      data: { messageId, userId: session.user.id, emoji },
    })
    return NextResponse.json({ action: "added" })
  }
}
