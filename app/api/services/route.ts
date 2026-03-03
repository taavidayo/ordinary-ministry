import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"

export async function GET() {
  const services = await db.service.findMany({
    orderBy: { date: "desc" },
    include: {
      times: {
        orderBy: { order: "asc" },
        include: {
          items: { include: { song: true, arrangement: true }, orderBy: { order: "asc" } },
        },
      },
    },
  })
  return NextResponse.json(services)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const { title, date, notes, categoryId, seriesId } = body
  if (!date) return NextResponse.json({ error: "date required" }, { status: 400 })

  const service = await db.service.create({
    data: {
      title: title ?? "",
      date: new Date(date),
      notes,
      categoryId: categoryId || null,
      seriesId: seriesId || null,
    },
  })
  return NextResponse.json(service, { status: 201 })
}
