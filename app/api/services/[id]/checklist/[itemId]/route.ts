import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string; itemId: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { itemId } = await params
  const { done } = await req.json()
  const item = await db.serviceChecklistItem.update({
    where: { id: itemId },
    data: {
      done: !!done,
      completedById: done ? session.user.id as string : null,
      completedAt: done ? new Date() : null,
    },
    include: {
      role: { select: { id: true, name: true } },
      completedBy: { select: { id: true, name: true } },
    },
  })
  return NextResponse.json(item)
}
