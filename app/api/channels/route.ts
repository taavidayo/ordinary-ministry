import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"

export async function GET(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const userId = session.user.id
  const { searchParams } = new URL(req.url)
  const includeArchived = searchParams.get("archived") === "true"

  // Public + team (member) + group (member) + private (member) channels
  const channels = await db.channel.findMany({
    where: {
      archivedAt: includeArchived ? { not: null } : null,
      OR: [
        { type: "PUBLIC" },
        {
          type: "TEAM",
          team: {
            members: { some: { userId } },
          },
        },
        {
          type: "GROUP",
          group: {
            members: { some: { userId } },
          },
        },
        {
          type: "PRIVATE",
          members: { some: { userId } },
        },
      ],
    },
    include: {
      members: { where: { userId }, select: { userId: true } },
    },
    orderBy: { createdAt: "asc" },
  })

  return NextResponse.json(
    channels.map((c) => ({
      id: c.id,
      name: c.name,
      icon: c.icon,
      description: c.description,
      type: c.type,
      teamId: c.teamId,
      groupId: c.groupId,
      createdById: c.createdById,
      createdAt: c.createdAt,
      archivedAt: c.archivedAt,
      isMember: c.members.length > 0,
    }))
  )
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { name, icon, description, type, teamId, groupId } = await req.json()
  if (!name || !type) return NextResponse.json({ error: "name and type required" }, { status: 400 })

  const channel = await db.channel.create({
    data: {
      name,
      icon: icon ?? null,
      description: description ?? null,
      type,
      teamId: teamId ?? null,
      groupId: groupId ?? null,
      createdById: session.user.id,
      members: {
        create: { userId: session.user.id },
      },
    },
  })

  return NextResponse.json(channel, { status: 201 })
}
