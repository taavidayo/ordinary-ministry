import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const channel = await db.channel.findUnique({ where: { id } })
  if (!channel) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (channel.type !== "PUBLIC") {
    return NextResponse.json({ error: "Can only join public channels" }, { status: 403 })
  }

  await db.channelMember.upsert({
    where: { channelId_userId: { channelId: id, userId: session.user.id } },
    create: { channelId: id, userId: session.user.id },
    update: {},
  })

  return NextResponse.json({ ok: true })
}
