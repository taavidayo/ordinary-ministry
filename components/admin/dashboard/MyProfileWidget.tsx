"use client"

import Link from "next/link"
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
  const b = new Date(birthday)
  const now = new Date()
  let age = now.getUTCFullYear() - b.getUTCFullYear()
  const m = now.getUTCMonth() - b.getUTCMonth()
  if (m < 0 || (m === 0 && now.getUTCDate() < b.getUTCDate())) age--
  return age
}

export default function MyProfileWidget({ user, timezone }: Props) {
  const initials = user.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
  const roleBadge = ROLE_BADGE[user.role] ?? "bg-muted text-gray-700"
  const roleLabel = ROLE_LABELS[user.role] ?? user.role

  return (
    <div className="flex flex-col h-full p-5 gap-4">
      {/* Avatar + name + role */}
      <div className="flex items-center gap-3">
        <div className="w-14 h-14 rounded-full bg-primary/10 text-primary flex items-center justify-center text-lg font-bold shrink-0 overflow-hidden ring-2 ring-primary/20">
          {user.avatar
            ? <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
            : initials
          }
        </div>
        <div className="min-w-0">
          <p className="font-semibold leading-tight truncate">{user.name}</p>
          <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium mt-0.5 ${roleBadge}`}>
            {roleLabel}
          </span>
        </div>
      </div>

      {/* Details */}
      <ul className="space-y-1.5 text-sm flex-1">
        <li className="flex items-center gap-2 text-muted-foreground min-w-0">
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

      {/* Footer */}
      <div className="pt-3 border-t flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Since {new Date(user.createdAt).toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: timezone })}
        </p>
        <Link
          href={`/mychurch/users/${user.id}`}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Edit profile <ChevronRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  )
}
