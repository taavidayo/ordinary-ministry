import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; timeId: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { timeId } = await params
  const body = await req.json()

  const time = await db.serviceTime.update({
    where: { id: timeId },
    data: {
      ...(body.label !== undefined ? { label: body.label } : {}),
      ...(body.startTime !== undefined ? { startTime: body.startTime || null } : {}),
    },
  })
  return NextResponse.json(time)
}

export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ id: string; timeId: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id: serviceId, timeId } = await params

  const count = await db.serviceTime.count({ where: { serviceId } })
  if (count <= 1) {
    return NextResponse.json({ error: "Cannot delete the only service time" }, { status: 400 })
  }

  await db.serviceTime.delete({ where: { id: timeId } })
  return NextResponse.json({ ok: true })
}
