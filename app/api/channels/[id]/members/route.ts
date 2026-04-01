import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const channel = await db.channel.findUnique({ where: { id } })
  if (!channel) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const isMember = await db.channelMember.findUnique({
    where: { channelId_userId: { channelId: id, userId: session.user.id } },
  })
  const isAdmin = session.user.role === "ADMIN"
  if (!isMember && !isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { userId } = await req.json()
  await db.channelMember.upsert({
    where: { channelId_userId: { channelId: id, userId } },
    create: { channelId: id, userId },
    update: {},
  })

  return NextResponse.json({ ok: true })
}
