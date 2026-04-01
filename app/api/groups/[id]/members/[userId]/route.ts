import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string; userId: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id, userId } = await params
  const { role } = await req.json()

  const member = await db.groupMember.update({
    where: { groupId_userId: { groupId: id, userId } },
    data: { role },
    include: { user: { select: { id: true, name: true, email: true, avatar: true } } },
  })
  return NextResponse.json(member)
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string; userId: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id, userId } = await params
  await db.groupMember.delete({ where: { groupId_userId: { groupId: id, userId } } })
  return NextResponse.json({ ok: true })
}
