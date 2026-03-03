import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  await params
  const { serviceTimeId, type, order, name, notes, sermonPassage, songId, arrangementId } = await req.json()

  try {
    const item = await db.programItem.create({
      data: {
        serviceTimeId,
        type,
        order,
        ...(name ? { name } : {}),
        notes: notes || null,
        sermonPassage: sermonPassage || null,
        ...(songId && { songId }),
        ...(arrangementId && { arrangementId }),
      },
      include: { song: true, arrangement: true },
    })
    return NextResponse.json(item, { status: 201 })
  } catch (e) {
    console.error("[items POST]", e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  await params
  const { items } = await req.json()

  await db.$transaction(
    items.map((item: { id: string; order: number }) =>
      db.programItem.update({ where: { id: item.id }, data: { order: item.order } })
    )
  )
  return NextResponse.json({ ok: true })
}
