import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import bcrypt from "bcryptjs"
import crypto from "crypto"

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const users = await db.user.findMany({
    select: { id: true, name: true, email: true, role: true, phone: true, createdAt: true },
    orderBy: { name: "asc" },
  })
  return NextResponse.json(users)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session || session.user.role !== "ADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const body = await req.json()
  const { name, email, password, role, phone, birthday, address, gender, socialProfiles } = body
  if (!name || !email) return NextResponse.json({ error: "name and email required" }, { status: 400 })

  const existing = await db.user.findUnique({ where: { email } })
  if (existing) return NextResponse.json({ error: "Email already in use" }, { status: 409 })

  // Allow passwordless creation (e.g. VISITOR profiles) — generate an unusable random hash
  const rawPassword = password || crypto.randomBytes(32).toString("hex")
  const passwordHash = await bcrypt.hash(rawPassword, 12)

  const user = await db.user.create({
    data: {
      name, email, passwordHash,
      role: role ?? "MEMBER",
      phone: phone || null,
      birthday: birthday ? new Date(birthday) : null,
      address: address || null,
      gender: gender || null,
      socialProfiles: socialProfiles || null,
    },
    select: { id: true, name: true, email: true, role: true, phone: true, createdAt: true },
  })
  return NextResponse.json(user, { status: 201 })
}
