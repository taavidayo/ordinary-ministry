import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"

export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ teamId: string; userId: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { teamId, userId } = await params
  await db.teamMember.deleteMany({ where: { teamId, userId } })
  return NextResponse.json({ ok: true })
}
