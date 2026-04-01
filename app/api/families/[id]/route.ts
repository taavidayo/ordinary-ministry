import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const family = await db.family.findUnique({
    where: { id },
    include: {
      members: {
        include: { user: { select: { id: true, name: true, avatar: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  })
  if (!family) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json(family)
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const role = session.user.role as string
  if (role !== "ADMIN" && role !== "LEADER") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { id } = await params
  const { name } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: "name required" }, { status: 400 })

  const family = await db.family.update({
    where: { id },
    data: { name: name.trim() },
    include: {
      members: {
        include: { user: { select: { id: true, name: true, avatar: true } } },
      },
    },
  })
  return NextResponse.json(family)
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session || (session.user.role as string) !== "ADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { id } = await params
  await db.family.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
