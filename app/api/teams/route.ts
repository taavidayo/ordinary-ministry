import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"

export async function GET() {
  const teams = await db.team.findMany({
    include: { roles: true, members: { include: { user: true } } },
    orderBy: { name: "asc" },
  })
  return NextResponse.json(teams)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const { name, description } = body
  if (!name) return NextResponse.json({ error: "name required" }, { status: 400 })

  const team = await db.team.create({
    data: {
      name,
      description,
      members: {
        create: { userId: session.user.id as string, isLeader: true },
      },
    },
    include: { members: { include: { user: true } }, channels: { select: { id: true, name: true }, take: 1 } },
  })
  return NextResponse.json(team, { status: 201 })
}
