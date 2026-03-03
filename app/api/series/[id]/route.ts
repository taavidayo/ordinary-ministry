import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const { name, description, imageUrl } = await req.json()
  const series = await db.serviceSeries.update({
    where: { id },
    data: { name, description, imageUrl },
  })
  return NextResponse.json(series)
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  await db.serviceSeries.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
