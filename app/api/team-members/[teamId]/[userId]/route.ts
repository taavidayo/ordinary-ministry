import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ teamId: string; userId: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { teamId, userId } = await params
  const body = await req.json()

  if ("isLeader" in body) {
    const member = await db.teamMember.updateMany({
      where: { teamId, userId },
      data: { isLeader: body.isLeader },
    })
    return NextResponse.json(member)
  }

  if ("roleIds" in body) {
    const roleIds: string[] = body.roleIds ?? []
    const member = await db.teamMember.findUnique({ where: { userId_teamId: { userId, teamId } } })
    if (!member) return NextResponse.json({ error: "Not found" }, { status: 404 })

    // Replace all roles for this member
    await db.teamMemberRole.deleteMany({ where: { teamMemberId: member.id } })
    if (roleIds.length > 0) {
      await db.teamMemberRole.createMany({
        data: roleIds.map((roleId) => ({ teamMemberId: member.id, roleId })),
        skipDuplicates: true,
      })
    }
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: "No recognized fields" }, { status: 400 })
}

export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ teamId: string; userId: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { teamId, userId } = await params
  await db.teamMember.deleteMany({ where: { teamId, userId } })
  return NextResponse.json({ ok: true })
}
