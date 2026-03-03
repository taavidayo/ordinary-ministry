import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; entryId: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { entryId } = await params
  const body = await req.json()

  const entry = await db.serviceScheduleEntry.update({
    where: { id: entryId },
    data: {
      ...(body.label !== undefined ? { label: body.label } : {}),
      ...(body.startTime !== undefined ? { startTime: body.startTime || null } : {}),
    },
  })
  return NextResponse.json(entry)
}

export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ id: string; entryId: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { entryId } = await params
  await db.serviceScheduleEntry.delete({ where: { id: entryId } })
  return NextResponse.json({ ok: true })
}
