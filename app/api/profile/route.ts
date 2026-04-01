import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import bcrypt from "bcryptjs"

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true, name: true, email: true, avatar: true, role: true,
      phone: true, birthday: true, address: true, gender: true, socialProfiles: true,
    },
  })
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json(user)
}

export async function PATCH(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { name, avatar, email, currentPassword, newPassword, phone, birthday, address, gender, socialProfiles, schedulingPreferences } = await req.json()

  const data: Record<string, unknown> = {}
  if (name !== undefined) data.name = name.trim()
  if (avatar !== undefined) data.avatar = avatar ?? ""
  if (phone !== undefined) data.phone = phone || null
  if (birthday !== undefined) data.birthday = birthday ? new Date(birthday) : null
  if (address !== undefined) data.address = address || null
  if (gender !== undefined) data.gender = gender || null
  if (socialProfiles !== undefined) data.socialProfiles = socialProfiles || null
  if (schedulingPreferences !== undefined) data.schedulingPreferences = schedulingPreferences || null

  if (email !== undefined) {
    const trimmed = email.trim().toLowerCase()
    if (trimmed) {
      const existing = await db.user.findFirst({
        where: { email: trimmed, NOT: { id: session.user.id } },
      })
      if (existing) return NextResponse.json({ error: "Email already in use" }, { status: 409 })
      data.email = trimmed
    }
  }

  if (newPassword) {
    if (!currentPassword) return NextResponse.json({ error: "Current password required" }, { status: 400 })
    const user = await db.user.findUnique({ where: { id: session.user.id } })
    if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 })
    const valid = await bcrypt.compare(currentPassword, user.passwordHash)
    if (!valid) return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 })
    data.passwordHash = await bcrypt.hash(newPassword, 10)
  }

  const updated = await db.user.update({
    where: { id: session.user.id },
    data,
    select: {
      id: true, name: true, email: true, avatar: true, role: true,
      phone: true, birthday: true, address: true, gender: true, socialProfiles: true,
    },
  })
  return NextResponse.json(updated)
}
