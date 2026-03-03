import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const template = await db.serviceTemplate.findUnique({
    where: { id },
    include: {
      times: { orderBy: { order: "asc" }, include: { items: { orderBy: { order: "asc" } } } },
      templateTeams: { include: { team: true, templateTime: true } },
    },
  })
  if (!template) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json(template)
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const { name, description } = await req.json()
  const template = await db.serviceTemplate.update({ where: { id }, data: { name, description } })
  return NextResponse.json(template)
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  await db.serviceTemplate.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
