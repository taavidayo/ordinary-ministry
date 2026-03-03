import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"

export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { itemId } = await params
  await db.programItem.delete({ where: { id: itemId } })
  return NextResponse.json({ ok: true })
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { itemId } = await params
  const body = await req.json()
  const item = await db.programItem.update({
    where: { id: itemId },
    data: body,
    include: { song: true, arrangement: true },
  })

  // Propagate editable fields to all items in the same sync group
  if (item.syncGroupId) {
    const syncFields: Record<string, unknown> = {}
    if (body.notes !== undefined) syncFields.notes = body.notes
    if (body.arrangementId !== undefined) syncFields.arrangementId = body.arrangementId
    if (body.name !== undefined) syncFields.name = body.name
    if (body.sermonPassage !== undefined) syncFields.sermonPassage = body.sermonPassage
    if (Object.keys(syncFields).length > 0) {
      await db.programItem.updateMany({
        where: { syncGroupId: item.syncGroupId, id: { not: itemId } },
        data: syncFields,
      })
    }
  }

  return NextResponse.json(item)
}
