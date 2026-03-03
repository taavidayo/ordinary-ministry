import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"

export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: serviceId } = await params
  const entries = await db.serviceScheduleEntry.findMany({
    where: { serviceId },
    orderBy: { order: "asc" },
  })
  return NextResponse.json(entries)
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id: serviceId } = await params
  const { label, startTime, order } = await req.json()

  const entry = await db.serviceScheduleEntry.create({
    data: { serviceId, label, startTime: startTime || null, order: order ?? 0 },
  })
  return NextResponse.json(entry, { status: 201 })
}
