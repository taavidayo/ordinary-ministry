import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const event = await db.event.findUnique({ where: { id } })
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json(event)
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  console.log("[events PATCH] body:", JSON.stringify(body))
  try {
    const event = await db.event.update({
      where: { id },
      data: {
        title: body.title ?? undefined,
        description: body.description !== undefined ? (body.description || null) : undefined,
        startDate: body.startDate ? new Date(body.startDate) : undefined,
        endDate: body.endDate !== undefined ? (body.endDate ? new Date(body.endDate) : null) : undefined,
        location: body.location !== undefined ? (body.location || null) : undefined,
        imageUrl: body.imageUrl !== undefined ? (body.imageUrl || null) : undefined,
        published: typeof body.published === "boolean" ? body.published : undefined,
        category: body.category !== undefined ? (body.category || null) : undefined,
        rsvpEnabled: typeof body.rsvpEnabled === "boolean" ? body.rsvpEnabled : undefined,
      },
    })
    return NextResponse.json(event)
  } catch (e) {
    console.error("[events PATCH] error:", e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  await db.event.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
