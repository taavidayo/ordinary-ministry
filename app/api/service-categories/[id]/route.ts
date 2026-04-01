import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if ((session?.user?.role as string) !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params
  const body = await req.json()

  try {
    const category = await db.serviceCategory.update({
      where: { id },
      data: {
        ...(body.name && { name: body.name }),
        ...(body.description !== undefined && { description: body.description || null }),
        ...(body.color && { color: body.color }),
        ...(body.minRole && { minRole: body.minRole }),
        ...(body.syncEvents !== undefined && { syncEvents: body.syncEvents }),
        ...(body.order !== undefined && { order: body.order }),
      },
    })

    // Whenever syncEvents is true, backfill any services that don't yet have a linked event.
    // The linkedEventId: null filter makes this idempotent — already-synced services are skipped.
    if (body.syncEvents === true) {
      const services = await db.service.findMany({
        where: { categoryId: id, linkedEventId: null },
      })
      for (const service of services) {
        const event = await db.event.create({
          data: {
            title: service.title?.trim() || category.name,
            description: service.notes || null,
            startDate: service.date,
            category: category.name,
          },
        })
        await db.service.update({
          where: { id: service.id },
          data: { linkedEventId: event.id },
        })
      }
      return NextResponse.json({ ...category, synced: services.length })
    }

    return NextResponse.json(category)
  } catch {
    return NextResponse.json({ error: "A category with that name already exists" }, { status: 409 })
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if ((session?.user?.role as string) !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params
  // Services in this category will have their categoryId set to null (onDelete: SetNull)
  await db.serviceCategory.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
