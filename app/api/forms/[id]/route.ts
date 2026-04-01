import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const form = await db.form.findUnique({
    where: { id },
    include: {
      fields: { orderBy: { order: "asc" } },
      event: true,
      _count: { select: { responses: true } },
    },
  })
  if (!form) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json(form)
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const body = await req.json()

  const form = await db.form.update({
    where: { id },
    data: {
      ...(body.title !== undefined && { title: body.title }),
      ...(body.description !== undefined && { description: body.description || null }),
      ...(body.googleSheetUrl !== undefined && { googleSheetUrl: body.googleSheetUrl || null }),
    },
    include: { fields: { orderBy: { order: "asc" } } },
  })
  return NextResponse.json(form)
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  await db.form.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
