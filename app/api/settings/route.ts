import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"

const DEFAULT_PERMISSIONS = {
  features: {
    services:  "VISITOR",
    teams:     "MEMBER",
    users:     "LEADER",
    offerings: "LEADER",
    sermons:   "VISITOR",
    events:    "VISITOR",
  },
  roles: {
    VISITOR: { label: "Visitor",  description: "New or guest attendees tracked for people care." },
    MEMBER:  { label: "Member",   description: "Regular church members." },
    LEADER:  { label: "Leader",   description: "Ministry leaders and volunteers." },
    ADMIN:   { label: "Admin",    description: "Full administrative access." },
  },
}

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const settings = await db.ministrySetting.upsert({
    where: { id: "default" },
    create: { id: "default", name: "Ordinary Ministry", permissions: DEFAULT_PERMISSIONS },
    update: {},
  })
  return NextResponse.json(settings)
}

export async function PATCH(req: Request) {
  const session = await auth()
  if ((session?.user?.role as string) !== "ADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const body = await req.json()
  const settings = await db.ministrySetting.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      name: body.name ?? "Ordinary Ministry",
      logoUrl: body.logoUrl ?? null,
      timezone: body.timezone ?? "UTC",
      permissions: body.permissions ?? DEFAULT_PERMISSIONS,
    },
    update: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.logoUrl !== undefined && { logoUrl: body.logoUrl || null }),
      ...(body.timezone !== undefined && { timezone: body.timezone }),
      ...(body.permissions !== undefined && { permissions: body.permissions }),
    },
  })
  return NextResponse.json(settings)
}
