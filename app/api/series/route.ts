import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const series = await db.serviceSeries.findMany({ orderBy: { name: "asc" } })
  return NextResponse.json(series)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { name, description, imageUrl } = await req.json()
  const series = await db.serviceSeries.create({ data: { name, description, imageUrl } })
  return NextResponse.json(series, { status: 201 })
}
