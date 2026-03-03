import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const tasks = await db.task.findMany({
    where: { userId: session.user?.id as string },
    orderBy: { createdAt: "asc" },
  })
  return NextResponse.json(tasks)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { content } = await req.json()
  if (!content) return NextResponse.json({ error: "content required" }, { status: 400 })

  const task = await db.task.create({
    data: { content, userId: session.user?.id as string },
  })
  return NextResponse.json(task, { status: 201 })
}
