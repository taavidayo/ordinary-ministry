import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const includeArchived = searchParams.get("includeArchived") === "true"
  const categories = await db.offeringCategory.findMany({
    where: includeArchived ? undefined : { archivedAt: null },
    orderBy: { name: "asc" },
  })
  return NextResponse.json(categories)
}

export async function POST(req: Request) {
  const session = await auth()
  if ((session?.user?.role as string) !== "ADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  const { name, color } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: "name required" }, { status: 400 })
  const cat = await db.offeringCategory.create({ data: { name: name.trim(), color: color || "gray" } })
  return NextResponse.json(cat, { status: 201 })
}
