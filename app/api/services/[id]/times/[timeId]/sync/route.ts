import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string; timeId: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { timeId } = await params
  const { sourceTimeId } = await req.json()

  const sourceItems = await db.programItem.findMany({
    where: { serviceTimeId: sourceTimeId },
    orderBy: { order: "asc" },
  })

  // Replace target time's items with copies from source
  await db.programItem.deleteMany({ where: { serviceTimeId: timeId } })

  const created = await db.$transaction(
    sourceItems.map((item) =>
      db.programItem.create({
        data: {
          serviceTimeId: timeId,
          type: item.type,
          order: item.order,
          name: item.name,
          notes: item.notes,
          songId: item.songId,
          arrangementId: item.arrangementId,
        },
        include: { song: true, arrangement: true },
      })
    )
  )

  return NextResponse.json(created)
}
