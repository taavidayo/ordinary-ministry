import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; messageId: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id, messageId } = await params
  await db.channelPin.deleteMany({ where: { channelId: id, messageId } })
  return new NextResponse(null, { status: 204 })
}
