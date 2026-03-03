import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { teamId, userId } = await req.json()
  if (!teamId || !userId) return NextResponse.json({ error: "teamId and userId required" }, { status: 400 })

  try {
    const member = await db.teamMember.create({ data: { teamId, userId } })
    return NextResponse.json(member, { status: 201 })
  } catch {
    return NextResponse.json({ error: "Already a member" }, { status: 409 })
  }
}
