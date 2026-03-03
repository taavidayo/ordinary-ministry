import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string; timeId: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { timeId } = await params
  const { label, startTime } = await req.json()
  const time = await db.serviceTemplateTime.update({
    where: { id: timeId },
    data: { ...(label !== undefined && { label }), ...(startTime !== undefined && { startTime: startTime || null }) },
  })
  return NextResponse.json(time)
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string; timeId: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { timeId } = await params
  await db.serviceTemplateTime.delete({ where: { id: timeId } })
  return NextResponse.json({ ok: true })
}
