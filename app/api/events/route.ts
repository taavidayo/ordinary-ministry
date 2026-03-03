import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"

export async function GET() {
  const events = await db.event.findMany({ orderBy: { startDate: "asc" } })
  return NextResponse.json(events)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const { title, description, startDate, endDate, location, imageUrl } = body
  if (!title || !startDate)
    return NextResponse.json({ error: "title and startDate required" }, { status: 400 })

  const event = await db.event.create({
    data: {
      title,
      description,
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : null,
      location,
      imageUrl,
    },
  })
  return NextResponse.json(event, { status: 201 })
}
