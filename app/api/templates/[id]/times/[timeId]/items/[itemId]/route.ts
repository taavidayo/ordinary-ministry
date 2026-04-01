import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string; timeId: string; itemId: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { itemId } = await params
  const body = await req.json()
  const item = await db.serviceTemplateItem.update({
    where: { id: itemId },
    data: body,
  })
  return NextResponse.json(item)
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string; timeId: string; itemId: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { itemId } = await params
  await db.serviceTemplateItem.delete({ where: { id: itemId } })
  return NextResponse.json({ ok: true })
}
