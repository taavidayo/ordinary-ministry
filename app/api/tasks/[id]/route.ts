import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const existing = await db.task.findUnique({ where: { id } })
  if (!existing || existing.userId !== (session.user?.id as string))
    return NextResponse.json({ error: "Not found" }, { status: 404 })

  const body = await req.json()
  const data: Record<string, unknown> = {}
  if ("done" in body) data.done = body.done
  if ("content" in body) data.content = body.content

  const task = await db.task.update({ where: { id }, data })
  return NextResponse.json(task)
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const existing = await db.task.findUnique({ where: { id } })
  if (!existing || existing.userId !== (session.user?.id as string))
    return NextResponse.json({ error: "Not found" }, { status: 404 })

  await db.task.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
