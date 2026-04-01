import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const category = await db.chatCategory.findUnique({ where: { id } })
  if (!category || category.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const { name, order, collapsed } = await req.json()
  const updated = await db.chatCategory.update({
    where: { id },
    data: {
      ...(name !== undefined ? { name: name.trim() } : {}),
      ...(order !== undefined ? { order } : {}),
      ...(collapsed !== undefined ? { collapsed } : {}),
    },
  })
  return NextResponse.json(updated)
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const category = await db.chatCategory.findUnique({ where: { id } })
  if (!category || category.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  // Memberships with this categoryId will have it set to null via onDelete: SetNull
  await db.chatCategory.delete({ where: { id } })
  return new NextResponse(null, { status: 204 })
}
