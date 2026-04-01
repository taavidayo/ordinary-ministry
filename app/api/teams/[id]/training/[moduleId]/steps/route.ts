import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"

export async function POST(req: Request, { params }: { params: Promise<{ id: string; moduleId: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { moduleId } = await params
  const body = await req.json()
  const { title, content } = body
  if (!title) return NextResponse.json({ error: "title required" }, { status: 400 })

  const maxOrder = await db.teamTrainingStep.aggregate({
    where: { moduleId },
    _max: { order: true },
  })
  const order = (maxOrder._max.order ?? -1) + 1

  const step = await db.teamTrainingStep.create({
    data: { moduleId, title, content: content ?? "[]", order },
    include: { completions: true },
  })
  return NextResponse.json(step, { status: 201 })
}
