import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"

async function canManageChannel(channelId: string, userId: string, isAdmin: boolean) {
  if (isAdmin) return true
  const channel = await db.channel.findUnique({ where: { id: channelId } })
  if (channel?.createdById === userId) return true
  const perm = await db.channelPermission.findUnique({
    where: { channelId_userId: { channelId, userId } },
  })
  return perm?.canManage ?? false
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const perms = await db.channelPermission.findMany({
    where: { channelId: id },
    include: { user: { select: { id: true, name: true, avatar: true } } },
    orderBy: { createdAt: "asc" },
  })
  return NextResponse.json(perms)
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  if (!(await canManageChannel(id, session.user.id, session.user.role === "ADMIN"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { userId, canEdit, canDelete, canManage } = await req.json()
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 })

  const perm = await db.channelPermission.upsert({
    where: { channelId_userId: { channelId: id, userId } },
    create: { channelId: id, userId, canEdit: !!canEdit, canDelete: !!canDelete, canManage: !!canManage },
    update: { canEdit: !!canEdit, canDelete: !!canDelete, canManage: !!canManage },
    include: { user: { select: { id: true, name: true, avatar: true } } },
  })
  return NextResponse.json(perm, { status: 201 })
}
