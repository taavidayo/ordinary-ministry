import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"

// PATCH /api/channels/[id]/membership — update current user's membership (e.g. categoryId)
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const { categoryId } = await req.json()

  const updated = await db.channelMember.update({
    where: { channelId_userId: { channelId: id, userId: session.user.id } },
    data: { categoryId: categoryId ?? null },
  })
  return NextResponse.json(updated)
}
