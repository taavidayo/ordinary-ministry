import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  if (body.startDate) body.startDate = new Date(body.startDate)
  if (body.endDate) body.endDate = new Date(body.endDate)
  const event = await db.event.update({ where: { id }, data: body })
  return NextResponse.json(event)
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  await db.event.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
