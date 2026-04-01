import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const userId = session.user.id as string
  const email = session.user.email as string

  const offerings = await db.offering.findMany({
    where: { OR: [{ userId }, { donorEmail: email }] },
    include: { category: { select: { id: true, name: true, color: true } } },
    orderBy: { createdAt: "desc" },
  })
  return NextResponse.json(offerings)
}
