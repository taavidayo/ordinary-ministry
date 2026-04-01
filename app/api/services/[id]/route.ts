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

  // Fetch current service to know existing linkedEventId and category
  const current = await db.service.findUnique({
    where: { id },
    select: { linkedEventId: true, categoryId: true },
  })

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
    include: { category: true },
  })

  const newCategoryId = service.categoryId
  const categoryChanged = body.categoryId !== undefined && newCategoryId !== current?.categoryId
  const shouldSync = service.category?.syncEvents ?? false
  const existingEventId = current?.linkedEventId

  if (shouldSync) {
    const eventTitle = (service.title?.trim() || service.category?.name) ?? "Service"
    const eventDate = service.date

    if (existingEventId) {
      // Update existing linked event
      await db.event.update({
        where: { id: existingEventId },
        data: {
          title: eventTitle,
          startDate: eventDate,
          category: service.category?.name ?? null,
          ...(body.notes !== undefined && { description: body.notes || null }),
        },
      })
    } else {
      // Create new linked event
      const event = await db.event.create({
        data: {
          title: eventTitle,
          description: service.notes || null,
          startDate: eventDate,
          published: true,
          category: service.category?.name ?? null,
        },
      })
      await db.service.update({
        where: { id },
        data: { linkedEventId: event.id },
      })
    }
  } else if (existingEventId && (categoryChanged || !shouldSync)) {
    // Category changed to one without sync, or sync turned off — remove linked event
    await db.service.update({ where: { id }, data: { linkedEventId: null } })
    await db.event.deleteMany({ where: { id: existingEventId } })
  }

  return NextResponse.json(service)
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params

  // Fetch linkedEventId before deleting
  const service = await db.service.findUnique({
    where: { id },
    select: { linkedEventId: true },
  })

  await db.service.delete({ where: { id } })

  // Clean up the linked event if one existed
  if (service?.linkedEventId) {
    await db.event.deleteMany({ where: { id: service.linkedEventId } })
  }

  return NextResponse.json({ ok: true })
}
