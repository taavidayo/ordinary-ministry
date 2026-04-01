import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params
  const statuses = await db.taskStatus.findMany({ where: { teamId: id }, orderBy: { order: "asc" } })
  return NextResponse.json(statuses)
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params
  const { name, color } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: "name required" }, { status: 400 })
  const count = await db.taskStatus.count({ where: { teamId: id } })
  const status = await db.taskStatus.create({ data: { teamId: id, name: name.trim(), color: color || "#6b7280", order: count } })
  return NextResponse.json(status, { status: 201 })
}
