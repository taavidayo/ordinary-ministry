import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"

export const dynamic = "force-dynamic"

export async function GET() {
  const row = await db.siteStyle.findUnique({ where: { id: "singleton" } })
  return NextResponse.json(row ?? { id: "singleton", styles: "{}" })
}

export async function PATCH(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { styles } = await req.json()
  const row = await db.siteStyle.upsert({
    where: { id: "singleton" },
    update: { styles: JSON.stringify(styles) },
    create: { id: "singleton", styles: JSON.stringify(styles) },
  })
  return NextResponse.json(row)
}
