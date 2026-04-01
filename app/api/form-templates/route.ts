import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const templates = await db.formTemplate.findMany({
    include: { fields: { orderBy: { order: "asc" } }, _count: { select: { forms: true } } },
    orderBy: { createdAt: "desc" },
  })
  return NextResponse.json(templates)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const { name, description } = body
  if (!name) return NextResponse.json({ error: "name required" }, { status: 400 })

  const template = await db.formTemplate.create({
    data: { name, description },
    include: { fields: { orderBy: { order: "asc" } }, _count: { select: { forms: true } } },
  })
  return NextResponse.json(template, { status: 201 })
}
