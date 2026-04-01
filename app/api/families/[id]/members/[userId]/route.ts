import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const role = session.user.role as string
  if (role !== "ADMIN" && role !== "LEADER") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { id: familyId, userId } = await params
  const { relationship } = await req.json()

  const member = await db.familyMember.update({
    where: { familyId_userId: { familyId, userId } },
    data: { relationship },
    include: { user: { select: { id: true, name: true, avatar: true } } },
  })
  return NextResponse.json(member)
}

export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const role = session.user.role as string
  if (role !== "ADMIN" && role !== "LEADER") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { id: familyId, userId } = await params
  await db.familyMember.delete({
    where: { familyId_userId: { familyId, userId } },
  })
  return NextResponse.json({ ok: true })
}
