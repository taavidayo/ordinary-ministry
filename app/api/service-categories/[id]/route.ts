import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if ((session?.user?.role as string) !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params
  const body = await req.json()

  try {
    const category = await db.serviceCategory.update({
      where: { id },
      data: {
        ...(body.name && { name: body.name }),
        ...(body.description !== undefined && { description: body.description || null }),
        ...(body.color && { color: body.color }),
        ...(body.minRole && { minRole: body.minRole }),
        ...(body.order !== undefined && { order: body.order }),
      },
    })
    return NextResponse.json(category)
  } catch {
    return NextResponse.json({ error: "A category with that name already exists" }, { status: 409 })
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if ((session?.user?.role as string) !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params
  // Services in this category will have their categoryId set to null (onDelete: SetNull)
  await db.serviceCategory.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
