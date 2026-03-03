import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const service = await db.service.findUnique({
    where: { id },
    include: {
      times: {
        orderBy: { order: "asc" },
        include: {
          items: {
            include: { song: true, arrangement: true },
            orderBy: { order: "asc" },
          },
        },
      },
      teams: {
        include: {
          team: true,
          slots: { include: { role: true, user: true } },
        },
      },
    },
  })
  if (!service) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json(service)
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const service = await db.service.update({
    where: { id },
    data: {
      ...(body.title !== undefined && { title: body.title }),
      ...(body.date && { date: new Date(body.date) }),
      ...(body.notes !== undefined && { notes: body.notes }),
      ...(body.categoryId !== undefined && { categoryId: body.categoryId || null }),
      ...(body.seriesId !== undefined && { seriesId: body.seriesId || null }),
      updatedById: session.user?.id as string,
    },
  })
  return NextResponse.json(service)
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  await db.service.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
