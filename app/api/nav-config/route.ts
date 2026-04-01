import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"

export const dynamic = "force-dynamic"

export async function GET() {
  const record = await db.navConfig.findUnique({ where: { id: "singleton" } })
  return NextResponse.json({ config: record?.config ?? "{}" })
}

export async function PATCH(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { config } = await req.json()
  const record = await db.navConfig.upsert({
    where: { id: "singleton" },
    create: { id: "singleton", config: JSON.stringify(config) },
    update: { config: JSON.stringify(config) },
  })
  return NextResponse.json({ config: record.config })
}
