import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import { randomUUID } from "crypto"

// POST: link two items into the same sync group
export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { itemId, pairItemId } = await req.json()

  const [source, target] = await Promise.all([
    db.programItem.findUnique({ where: { id: itemId } }),
    db.programItem.findUnique({ where: { id: pairItemId } }),
  ])
  if (!source || !target) return NextResponse.json({ error: "Item not found" }, { status: 404 })

  // Use existing syncGroupId if either already has one, else create new
  const groupId = source.syncGroupId ?? target.syncGroupId ?? randomUUID()

  await db.programItem.updateMany({
    where: { id: { in: [itemId, pairItemId] } },
    data: { syncGroupId: groupId },
  })

  // Sync target's notes/arrangement to match source
  const syncFields: Record<string, unknown> = {}
  if (source.notes !== undefined) syncFields.notes = source.notes
  if (source.arrangementId !== undefined) syncFields.arrangementId = source.arrangementId
  if (source.name !== undefined) syncFields.name = source.name
  if (Object.keys(syncFields).length > 0) {
    await db.programItem.update({
      where: { id: pairItemId },
      data: syncFields,
    })
  }

  return NextResponse.json({ syncGroupId: groupId })
}
