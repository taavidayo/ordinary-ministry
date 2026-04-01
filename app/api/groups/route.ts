import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"

export async function GET() {
  const groups = await db.group.findMany({
    include: {
      category: true,
      members: {
        include: { user: { select: { id: true, name: true, email: true, avatar: true } } },
      },
      channels: { select: { id: true, name: true }, take: 1 },
    },
    orderBy: { name: "asc" },
  })
  return NextResponse.json(groups)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const { name, description, groupType, categoryId } = body
  if (!name?.trim()) return NextResponse.json({ error: "name required" }, { status: 400 })

  const group = await db.group.create({
    data: {
      name: name.trim(),
      description: description ?? null,
      groupType: groupType ?? null,
      categoryId: categoryId ?? null,
      members: {
        create: { userId: session.user.id as string, role: "LEADER" },
      },
    },
    include: {
      category: true,
      members: { include: { user: { select: { id: true, name: true, email: true, avatar: true } } } },
      channels: { select: { id: true, name: true }, take: 1 },
    },
  })
  return NextResponse.json(group, { status: 201 })
}
