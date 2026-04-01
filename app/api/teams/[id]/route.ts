import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const team = await db.team.findUnique({
    where: { id },
    include: { roles: true, members: { include: { user: true } } },
  })
  if (!team) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json(team)
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const { name, description, imageUrl, imageFocalX, imageFocalY, channelId, archivedAt } = body

  try {
    const team = await db.team.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(imageUrl !== undefined && { imageUrl }),
        ...(imageFocalX !== undefined && { imageFocalX: imageFocalX === null ? null : Number(imageFocalX) }),
        ...(imageFocalY !== undefined && { imageFocalY: imageFocalY === null ? null : Number(imageFocalY) }),
        ...(archivedAt !== undefined && { archivedAt: archivedAt === null ? null : new Date(archivedAt) }),
        ...(channelId !== undefined && {
          channels: channelId ? { connect: { id: channelId } } : { set: [] },
        }),
      },
      include: { channels: { select: { id: true, name: true } } },
    })
    return NextResponse.json(team)
  } catch (err) {
    console.error("[PATCH /api/teams/:id]", err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  await db.team.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
