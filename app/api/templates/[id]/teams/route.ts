import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id: templateId } = await params
  const { teamId, templateTimeId } = await req.json()
  const entry = await db.serviceTemplateTeam.create({
    data: { templateId, teamId, templateTimeId: templateTimeId ?? null },
    include: { team: true, templateTime: true },
  })
  return NextResponse.json(entry, { status: 201 })
}
