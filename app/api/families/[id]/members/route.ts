import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const role = session.user.role as string
  if (role !== "ADMIN" && role !== "LEADER") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { id: familyId } = await params
  const { userId, relationship } = await req.json()
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 })

  const member = await db.familyMember.upsert({
    where: { familyId_userId: { familyId, userId } },
    create: { familyId, userId, relationship: relationship ?? "Member" },
    update: { relationship: relationship ?? "Member" },
    include: { user: { select: { id: true, name: true, avatar: true } } },
  })
  return NextResponse.json(member, { status: 201 })
}
