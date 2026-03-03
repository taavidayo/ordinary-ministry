import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id: serviceId } = await params
  const { label } = await req.json()

  const count = await db.serviceTime.count({ where: { serviceId } })
  const time = await db.serviceTime.create({
    data: { serviceId, label: label || `Service ${count + 1}`, order: count },
    include: {
      items: { include: { song: true, arrangement: true }, orderBy: { order: "asc" } },
    },
  })
  return NextResponse.json(time, { status: 201 })
}
