import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const data: Record<string, unknown> = {}
  if ("userId" in body) data.userId = body.userId ?? null
  if ("status" in body) data.status = body.status
  if ("rehearsal" in body) data.rehearsal = body.rehearsal
  if ("notes" in body) data.notes = body.notes ?? null

  const slot = await db.serviceSlot.update({
    where: { id },
    data,
    include: { user: true, role: true },
  })
  return NextResponse.json(slot)
}
