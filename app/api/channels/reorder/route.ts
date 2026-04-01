import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"

// POST body: { channelIds: string[] }  (ordered list for this user's group)
export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { channelIds } = await req.json()
  if (!Array.isArray(channelIds)) return NextResponse.json({ error: "channelIds required" }, { status: 400 })

  await Promise.all(
    channelIds.map((channelId: string, index: number) =>
      db.channelMember.updateMany({
        where: { channelId, userId: session.user.id },
        data: { order: index },
      })
    )
  )

  return NextResponse.json({ ok: true })
}
