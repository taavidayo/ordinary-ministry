import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"

export async function GET() {
  const categories = await db.groupCategory.findMany({ orderBy: { name: "asc" } })
  return NextResponse.json(categories)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { name } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: "name required" }, { status: 400 })

  const category = await db.groupCategory.create({ data: { name: name.trim() } })
  return NextResponse.json(category, { status: 201 })
}
