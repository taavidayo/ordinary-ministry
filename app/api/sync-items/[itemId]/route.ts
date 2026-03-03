import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"

// DELETE: remove an item from its sync group
export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ itemId: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { itemId } = await params
  await db.programItem.update({ where: { id: itemId }, data: { syncGroupId: null } })
  return NextResponse.json({ ok: true })
}
