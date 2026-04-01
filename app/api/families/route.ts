import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"

export async function GET(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const url = new URL(req.url)
  const search = url.searchParams.get("search")?.trim()

  const families = await db.family.findMany({
    where: search ? { name: { contains: search, mode: "insensitive" } } : undefined,
    orderBy: { name: "asc" },
    include: {
      members: {
        include: { user: { select: { id: true, name: true, avatar: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  })
  return NextResponse.json(families)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const role = session.user.role as string
  if (role !== "ADMIN" && role !== "LEADER") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { name, userId, relationship } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: "name required" }, { status: 400 })

  const family = await db.family.create({
    data: {
      name: name.trim(),
      ...(userId ? {
        members: { create: { userId, relationship: relationship ?? "Member" } },
      } : {}),
    },
    include: {
      members: {
        include: { user: { select: { id: true, name: true, avatar: true } } },
      },
    },
  })
  return NextResponse.json(family, { status: 201 })
}
