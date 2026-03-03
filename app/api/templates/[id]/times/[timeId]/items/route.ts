import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import type { ProgramItemType } from "@/lib/generated/prisma/enums"

export async function POST(req: Request, { params }: { params: Promise<{ id: string; timeId: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { timeId } = await params
  const { type, name } = await req.json()
  const count = await db.serviceTemplateItem.count({ where: { templateTimeId: timeId } })
  const item = await db.serviceTemplateItem.create({
    data: { templateTimeId: timeId, type: type as ProgramItemType, name: name ?? null, order: count },
  })
  return NextResponse.json(item, { status: 201 })
}
