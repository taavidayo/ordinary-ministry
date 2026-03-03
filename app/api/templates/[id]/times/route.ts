import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id: templateId } = await params
  const { label, startTime } = await req.json()
  const count = await db.serviceTemplateTime.count({ where: { templateId } })
  const time = await db.serviceTemplateTime.create({
    data: { templateId, label, startTime: startTime ?? null, order: count },
    include: { items: true },
  })
  return NextResponse.json(time, { status: 201 })
}
