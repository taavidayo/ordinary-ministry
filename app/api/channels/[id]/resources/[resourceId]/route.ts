import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; resourceId: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { resourceId } = await params
  const resource = await db.channelResource.findUnique({ where: { id: resourceId } })
  if (!resource) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const isAdmin = session.user.role === "ADMIN"
  if (resource.addedById !== session.user.id && !isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  await db.channelResource.delete({ where: { id: resourceId } })
  return new NextResponse(null, { status: 204 })
}
