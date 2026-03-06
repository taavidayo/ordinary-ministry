import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"

export async function GET() {
  const categories = await db.serviceCategory.findMany({
    orderBy: [{ order: "asc" }, { name: "asc" }],
    include: { _count: { select: { services: true } } },
  })
  return NextResponse.json(categories)
}

export async function POST(req: Request) {
  const session = await auth()
  if ((session?.user?.role as string) !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { name, description, color, minRole, syncEvents, order } = await req.json()
  if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 })

  try {
    const category = await db.serviceCategory.create({
      data: {
        name,
        description: description || null,
        color: color || "gray",
        minRole: minRole || "MEMBER",
        syncEvents: syncEvents ?? false,
        order: order ?? 0,
      },
      include: { _count: { select: { services: true } } },
    })
    return NextResponse.json(category, { status: 201 })
  } catch {
    return NextResponse.json({ error: "A category with that name already exists" }, { status: 409 })
  }
}
