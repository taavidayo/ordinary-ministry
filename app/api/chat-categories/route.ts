import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const categories = await db.chatCategory.findMany({
    where: { userId: session.user.id },
    orderBy: { order: "asc" },
  })
  return NextResponse.json(categories)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { name } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: "name required" }, { status: 400 })

  // Place after existing categories
  const last = await db.chatCategory.findFirst({
    where: { userId: session.user.id },
    orderBy: { order: "desc" },
  })

  const category = await db.chatCategory.create({
    data: { userId: session.user.id, name: name.trim(), order: (last?.order ?? -1) + 1 },
  })
  return NextResponse.json(category, { status: 201 })
}
