import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id: channelId } = await params

  await db.channelMember.updateMany({
    where: { channelId, userId: session.user.id },
    data: { lastRead: new Date() },
  })

  return NextResponse.json({ ok: true })
}
