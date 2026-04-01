import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"

export async function GET() {
  const ministries = await db.ministry.findMany({ orderBy: { name: "asc" } })
  return NextResponse.json(ministries)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user?.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { name, description, color } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: "name required" }, { status: 400 })

  const ministry = await db.ministry.create({
    data: { name: name.trim(), description: description ?? null, color: color ?? "gray" },
  })
  return NextResponse.json(ministry, { status: 201 })
}
