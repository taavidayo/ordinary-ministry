import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const emojis = await db.customEmoji.findMany({ orderBy: { name: "asc" } })
  return NextResponse.json(emojis)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { name, imageUrl } = await req.json()
  if (!name || !imageUrl) {
    return NextResponse.json({ error: "name and imageUrl required" }, { status: 400 })
  }

  const emoji = await db.customEmoji.create({
    data: { name, imageUrl, createdById: session.user.id },
  })
  return NextResponse.json(emoji, { status: 201 })
}
