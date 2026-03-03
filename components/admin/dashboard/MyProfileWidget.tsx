"use client"

import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Mail, Phone, CalendarDays, Users, ChevronRight } from "lucide-react"
import { ROLE_BADGE, ROLE_LABELS } from "@/lib/category-colors"

export interface UserProfileData {
  id: string
  name: string
  email: string
  role: string
  phone: string | null
  birthday: string | null
  avatar: string | null
  createdAt: string
  teams: string[]
}

interface Props {
  user: UserProfileData
  timezone: string
}

function getAge(birthday: string): number {
  // Use UTC to avoid timezone shifting the birth date
  const b = new Date(birthday)
  const now = new Date()
  let age = now.getUTCFullYear() - b.getUTCFullYear()
  const m = now.getUTCMonth() - b.getUTCMonth()
  if (m < 0 || (m === 0 && now.getUTCDate() < b.getUTCDate())) age--
  return age
}

export default function MyProfileWidget({ user, timezone }: Props) {
  const initials = user.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
  const roleBadge = ROLE_BADGE[user.role] ?? "bg-gray-100 text-gray-700"
  const roleLabel = ROLE_LABELS[user.role] ?? user.role

  return (
    <Card className="h-full">
      <CardContent className="pt-5 space-y-4">
        {/* Avatar + name + role */}
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-semibold shrink-0 overflow-hidden">
            {user.avatar
              ? <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
              : initials
            }
          </div>
          <div className="min-w-0">
            <p className="font-semibold leading-tight truncate">{user.name}</p>
            <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${roleBadge}`}>
              {roleLabel}
            </span>
          </div>
        </div>

        {/* Details */}
        <ul className="space-y-1.5 text-sm">
          <li className="flex items-center gap-2 text-muted-foreground">
            <Mail className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{user.email}</span>
          </li>
          {user.phone && (
            <li className="flex items-center gap-2 text-muted-foreground">
              <Phone className="h-3.5 w-3.5 shrink-0" />
              <span>{user.phone}</span>
            </li>
          )}
          {user.birthday && (
            <li className="flex items-center gap-2 text-muted-foreground">
              <CalendarDays className="h-3.5 w-3.5 shrink-0" />
              <span>
                {new Date(user.birthday).toLocaleDateString("en-US", {
                  month: "long", day: "numeric", timeZone: "UTC",
                })}
                {" · "}{getAge(user.birthday)} yrs
              </span>
            </li>
          )}
          {user.teams.length > 0 && (
            <li className="flex items-start gap-2 text-muted-foreground">
              <Users className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <span className="leading-snug">{user.teams.join(", ")}</span>
            </li>
          )}
        </ul>

        <p className="text-xs text-muted-foreground">
          Since {new Date(user.createdAt).toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: timezone })}
        </p>

        <Link
          href={`/admin/users/${user.id}`}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Edit profile <ChevronRight className="h-3 w-3" />
        </Link>
      </CardContent>
    </Card>
  )
}
