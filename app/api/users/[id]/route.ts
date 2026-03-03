import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import bcrypt from "bcryptjs"

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const user = await db.user.findUnique({
    where: { id },
    select: {
      id: true, name: true, email: true, role: true, phone: true,
      avatar: true, birthday: true, address: true, gender: true,
      socialProfiles: true, createdAt: true,
      teamMemberships: { include: { team: { select: { id: true, name: true } } } },
      serviceSlots: {
        where: { userId: id },
        include: {
          role: { select: { name: true } },
          serviceTeam: {
            include: {
              team: { select: { name: true } },
              service: { select: { id: true, title: true, date: true } },
            },
          },
        },
      },
    },
  })
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json(user)
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const sessionRole = session.user.role as string
  const sessionId = session.user.id as string
  const isAdmin = sessionRole === "ADMIN"
  const isLeader = sessionRole === "LEADER"
  const isSelf = sessionId === id

  // Only admin, leaders, or the user themselves can edit
  if (!isAdmin && !isLeader && !isSelf) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = await req.json()
  const { password, teamIds, role, birthday, socialProfiles, address, gender, ...rest } = body

  const data: Record<string, unknown> = {}

  // Fields anyone can edit on their own profile; admin/leader can edit on others
  if (rest.name !== undefined) data.name = rest.name
  if (rest.phone !== undefined) data.phone = rest.phone || null
  if (rest.email !== undefined && isAdmin) data.email = rest.email

  // Extended fields — admin only on others, self can edit own
  if (isAdmin || isSelf) {
    if (birthday !== undefined) data.birthday = birthday ? new Date(birthday) : null
    if (address !== undefined) data.address = address || null
    if (gender !== undefined) data.gender = gender || null
    if (socialProfiles !== undefined) data.socialProfiles = socialProfiles || null
  }

  if (isLeader && !isAdmin && !isSelf) {
    if (address !== undefined) data.address = address || null
  }

  // Role changes: ADMIN only
  if (role !== undefined && isAdmin) data.role = role

  // Password change
  if (password && (isAdmin || isSelf)) {
    data.passwordHash = await bcrypt.hash(password, 12)
  }

  const user = await db.user.update({
    where: { id },
    data,
    select: {
      id: true, name: true, email: true, role: true, phone: true,
      avatar: true, birthday: true, address: true, gender: true, socialProfiles: true,
    },
  })

  // Handle team membership changes (admin only)
  if (teamIds !== undefined && isAdmin) {
    const existing = await db.teamMember.findMany({ where: { userId: id }, select: { teamId: true } })
    const existingIds = new Set(existing.map((m) => m.teamId))
    const newIds = new Set(teamIds as string[])

    const toAdd = [...newIds].filter((tid) => !existingIds.has(tid))
    const toRemove = [...existingIds].filter((tid) => !newIds.has(tid))

    await db.$transaction([
      ...toAdd.map((teamId) => db.teamMember.create({ data: { userId: id, teamId } })),
      ...(toRemove.length > 0
        ? [db.teamMember.deleteMany({ where: { userId: id, teamId: { in: toRemove } } })]
        : []),
    ])
  }

  return NextResponse.json(user)
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session || session.user.role !== "ADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { id } = await params
  await db.user.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
