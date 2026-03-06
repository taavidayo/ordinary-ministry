import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const { name, defaultSpeaker, autoSync } = await req.json()

  const playlist = await db.sermonPlaylist.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(defaultSpeaker !== undefined && { defaultSpeaker }),
      ...(autoSync !== undefined && { autoSync }),
    },
    include: { _count: { select: { sermons: true } } },
  })
  return NextResponse.json(playlist)
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  await db.sermonPlaylist.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
