import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const templates = await db.serviceTemplate.findMany({
    orderBy: { name: "asc" },
    include: {
      times: { orderBy: { order: "asc" }, include: { items: { orderBy: { order: "asc" } } } },
      templateTeams: { include: { team: true, templateTime: true } },
    },
  })
  return NextResponse.json(templates)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { name, description } = await req.json()
  const template = await db.serviceTemplate.create({
    data: { name, description },
    include: {
      times: { orderBy: { order: "asc" }, include: { items: true } },
      templateTeams: { include: { team: true, templateTime: true } },
    },
  })
  return NextResponse.json(template, { status: 201 })
}
