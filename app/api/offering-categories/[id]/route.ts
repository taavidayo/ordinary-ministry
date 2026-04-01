import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if ((session?.user?.role as string) !== "ADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  const { id } = await params
  const { name, color, published, archived } = await req.json()
  const cat = await db.offeringCategory.update({
    where: { id },
    data: {
      ...(name && { name }),
      ...(color && { color }),
      ...(published !== undefined && { published }),
      ...(archived !== undefined && { archivedAt: archived ? new Date() : null }),
    },
  })
  return NextResponse.json(cat)
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if ((session?.user?.role as string) !== "ADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  const { id } = await params
  await db.offeringCategory.delete({ where: { id } })
  return new NextResponse(null, { status: 204 })
}
