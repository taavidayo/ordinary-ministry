import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import bcrypt from "bcryptjs"
import crypto from "crypto"

interface ImportRow {
  name: string
  email: string
  phone?: string
  birthday?: string
  gender?: string
  address?: string
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session || session.user.role !== "ADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const body = await req.json()
  const rows: ImportRow[] = body.rows
  if (!Array.isArray(rows) || rows.length === 0)
    return NextResponse.json({ error: "No rows provided" }, { status: 400 })

  const created: string[] = []
  const skipped: string[] = []
  const errors: string[] = []

  for (const row of rows) {
    if (!row.name || !row.email) {
      errors.push(`Missing name or email — skipped`)
      continue
    }
    try {
      const existing = await db.user.findUnique({ where: { email: row.email } })
      if (existing) {
        skipped.push(row.email)
        continue
      }
      const passwordHash = await bcrypt.hash(crypto.randomBytes(32).toString("hex"), 12)
      await db.user.create({
        data: {
          name: row.name,
          email: row.email,
          passwordHash,
          role: "MEMBER",
          phone: row.phone || null,
          birthday: row.birthday ? new Date(row.birthday) : null,
          gender: row.gender || null,
          address: row.address || null,
        },
      })
      created.push(row.email)
    } catch (err) {
      errors.push(`${row.email}: ${String(err)}`)
    }
  }

  return NextResponse.json({ created: created.length, skipped: skipped.length, errors })
}
