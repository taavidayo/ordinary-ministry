import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const team = await db.team.findUnique({
    where: { id },
    include: { roles: true, members: { include: { user: true } } },
  })
  if (!team) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json(team)
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const team = await db.team.update({ where: { id }, data: body })
  return NextResponse.json(team)
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  await db.team.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
