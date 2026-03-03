import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { teamId, name } = await req.json()
  if (!teamId || !name) return NextResponse.json({ error: "teamId and name required" }, { status: 400 })

  const role = await db.teamRole.create({ data: { teamId, name } })
  return NextResponse.json(role, { status: 201 })
}
