import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id, userId } = await params
  const channel = await db.channel.findUnique({ where: { id } })
  if (!channel) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const isAdmin = session.user.role === "ADMIN"
  const isSelf = session.user.id === userId
  const isCreator = channel.createdById === session.user.id
  if (!isSelf && !isAdmin && !isCreator) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  await db.channelMember.deleteMany({
    where: { channelId: id, userId },
  })

  return new NextResponse(null, { status: 204 })
}
