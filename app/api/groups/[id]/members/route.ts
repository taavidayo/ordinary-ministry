import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const members = await db.groupMember.findMany({
    where: { groupId: id },
    include: { user: { select: { id: true, name: true, email: true, avatar: true } } },
    orderBy: [{ role: "asc" }, { joinedAt: "asc" }],
  })
  return NextResponse.json(members)
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const { userId, role } = await req.json()
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 })

  const member = await db.groupMember.upsert({
    where: { groupId_userId: { groupId: id, userId } },
    create: { groupId: id, userId, role: role ?? "MEMBER" },
    update: { role: role ?? "MEMBER" },
    include: { user: { select: { id: true, name: true, email: true, avatar: true } } },
  })
  return NextResponse.json(member, { status: 201 })
}
