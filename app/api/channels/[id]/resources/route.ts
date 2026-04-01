import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const resources = await db.channelResource.findMany({
    where: { channelId: id },
    include: { addedBy: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json(resources)
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const { title, url } = await req.json()
  if (!title || !url) return NextResponse.json({ error: "title and url required" }, { status: 400 })

  const resource = await db.channelResource.create({
    data: { channelId: id, title, url, addedById: session.user.id },
    include: { addedBy: { select: { name: true } } },
  })

  return NextResponse.json(resource, { status: 201 })
}
