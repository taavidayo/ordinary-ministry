import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"

export async function POST(_: Request, { params }: { params: Promise<{ id: string; moduleId: string; stepId: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { stepId } = await params
  const userId = session.user.id

  const existing = await db.teamTrainingCompletion.findUnique({
    where: { stepId_userId: { stepId, userId } },
  })

  if (existing) {
    await db.teamTrainingCompletion.delete({ where: { id: existing.id } })
    return NextResponse.json({ completed: false })
  } else {
    await db.teamTrainingCompletion.create({ data: { stepId, userId } })
    return NextResponse.json({ completed: true })
  }
}
