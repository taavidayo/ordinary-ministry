import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const modules = await db.teamTrainingModule.findMany({
    where: { teamId: id },
    include: {
      steps: {
        include: {
          completions: true,
        },
        orderBy: { order: "asc" },
      },
    },
    orderBy: { order: "asc" },
  })
  return NextResponse.json(modules)
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const { title, description } = body
  if (!title) return NextResponse.json({ error: "title required" }, { status: 400 })

  const maxOrder = await db.teamTrainingModule.aggregate({
    where: { teamId: id },
    _max: { order: true },
  })
  const order = (maxOrder._max.order ?? -1) + 1

  const module = await db.teamTrainingModule.create({
    data: { teamId: id, title, description, order },
    include: {
      steps: { include: { completions: true }, orderBy: { order: "asc" } },
    },
  })
  return NextResponse.json(module, { status: 201 })
}
