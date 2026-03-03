import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const announcements = await db.announcement.findMany({
    orderBy: { createdAt: "desc" },
    include: { author: { select: { id: true, name: true } } },
  })
  return NextResponse.json(announcements)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user?.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { title, body } = await req.json()
  if (!title || !body) return NextResponse.json({ error: "title and body required" }, { status: 400 })

  const announcement = await db.announcement.create({
    data: { title, body, authorId: session.user.id as string },
    include: { author: { select: { id: true, name: true } } },
  })
  return NextResponse.json(announcement, { status: 201 })
}
