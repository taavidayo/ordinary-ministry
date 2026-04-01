import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"

export async function GET() {
  const categories = await db.memberCategory.findMany({ orderBy: { name: "asc" } })
  return NextResponse.json(categories)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user?.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { name, color } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: "name required" }, { status: 400 })

  const category = await db.memberCategory.create({
    data: { name: name.trim(), color: color ?? "gray" },
  })
  return NextResponse.json(category, { status: 201 })
}
