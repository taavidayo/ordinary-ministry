import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const group = await db.group.findUnique({
    where: { id },
    include: {
      category: true,
      channels: { select: { id: true, name: true } },
      members: {
        include: { user: { select: { id: true, name: true, email: true, avatar: true } } },
        orderBy: [{ role: "asc" }, { joinedAt: "asc" }],
      },
      events: {
        include: {
          attendance: { include: { user: { select: { id: true, name: true, avatar: true } } } },
        },
        orderBy: { startDate: "asc" },
      },
    },
  })
  if (!group) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json(group)
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const {
    name, description, imageUrl, imageFocalX, imageFocalY, groupType,
    showOnFrontPage, registration, openTime, closeTime, categoryId, channelId, archivedAt,
  } = body

  try {
    const group = await db.group.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(imageUrl !== undefined && { imageUrl }),
        ...(imageFocalX !== undefined && { imageFocalX: imageFocalX === null ? null : Number(imageFocalX) }),
        ...(imageFocalY !== undefined && { imageFocalY: imageFocalY === null ? null : Number(imageFocalY) }),
        ...(groupType !== undefined && { groupType }),
        ...(showOnFrontPage !== undefined && { showOnFrontPage }),
        ...(registration !== undefined && { registration }),
        ...(openTime !== undefined && { openTime }),
        ...(closeTime !== undefined && { closeTime }),
        ...(categoryId !== undefined && { categoryId }),
        ...(archivedAt !== undefined && { archivedAt: archivedAt === null ? null : new Date(archivedAt) }),
        ...(channelId !== undefined && {
          channels: channelId
            ? { connect: { id: channelId } }
            : { set: [] },
        }),
      },
      include: {
        category: true,
        channels: { select: { id: true, name: true } },
        members: {
          include: { user: { select: { id: true, name: true, email: true, avatar: true } } },
        },
      },
    })
    return NextResponse.json(group)
  } catch (err) {
    console.error("[PATCH /api/groups/:id]", err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  await db.group.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
