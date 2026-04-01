import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const body = await req.json()

  const allowed = ["teamId", "name", "description", "icon"]
  const data = Object.fromEntries(Object.entries(body).filter(([k]) => allowed.includes(k)))

  const channel = await db.channel.update({ where: { id }, data })
  return NextResponse.json(channel)
}
