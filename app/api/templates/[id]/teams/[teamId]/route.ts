import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string; teamId: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { teamId } = await params
  await db.serviceTemplateTeam.delete({ where: { id: teamId } })
  return NextResponse.json({ ok: true })
}
