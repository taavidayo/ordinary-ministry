import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"

export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ id: string; noteId: string }> }
) {
  const session = await auth()
  if ((session?.user?.role as string) !== "ADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { noteId } = await params
  await db.profileNote.delete({ where: { id: noteId } })
  return NextResponse.json({ ok: true })
}
