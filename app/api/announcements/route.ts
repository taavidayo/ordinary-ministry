import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"

const CAN_POST_ROLES = ["ADMIN", "LEADER"]

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const now = new Date()
  const announcements = await db.announcement.findMany({
    where: { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
    orderBy: { createdAt: "desc" },
    include: { author: { select: { id: true, name: true } } },
  })
  return NextResponse.json(announcements)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!CAN_POST_ROLES.includes(session.user?.role ?? "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { title, body, expiresAt } = await req.json()
  if (!title || !body) return NextResponse.json({ error: "title and body required" }, { status: 400 })

  // Default to 1 week from now if not provided
  const expiry = expiresAt ? new Date(expiresAt) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

  const announcement = await db.announcement.create({
    data: { title, body, authorId: session.user.id as string, expiresAt: expiry },
    include: { author: { select: { id: true, name: true } } },
  })
  return NextResponse.json(announcement, { status: 201 })
}
