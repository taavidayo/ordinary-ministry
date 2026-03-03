"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  UsersRound,
  Heart,
  Tv2,
  CalendarCheck,
  Settings,
  LogOut,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { ROLE_RANK } from "@/lib/category-colors"

interface FeaturePermissions {
  services?: string
  teams?: string
  users?: string
  offerings?: string
  sermons?: string
  events?: string
}

interface NavSettings {
  name: string
  logoUrl?: string | null
  featurePermissions: FeaturePermissions
}

interface Props {
  user: { name?: string | null; email?: string | null; role?: string }
  settings: NavSettings
}

const ALL_NAV_ITEMS = [
  { href: "/admin/dashboard",  label: "Dashboard",  icon: LayoutDashboard, feature: "dashboard" },
  { href: "/admin/services",   label: "Services",   icon: CalendarDays,    feature: "services" },
  { href: "/admin/teams",      label: "Teams",      icon: UsersRound,      feature: "teams" },
  { href: "/admin/users",      label: "Users",      icon: Users,           feature: "users" },
  { href: "/admin/offerings",  label: "Offerings",  icon: Heart,           feature: "offerings" },
  { href: "/admin/sermons",    label: "Sermons",    icon: Tv2,             feature: "sermons" },
  { href: "/admin/events",     label: "Events",     icon: CalendarCheck,   feature: "events" },
]

export default function AdminNav({ user, settings }: Props) {
  const pathname = usePathname()
  const userRole = user.role ?? "MEMBER"
  const userRank = ROLE_RANK[userRole] ?? 1
  const isAdmin = userRole === "ADMIN"

  const fp = settings.featurePermissions

  const visibleNav = ALL_NAV_ITEMS.filter(({ feature }) => {
    if (feature === "dashboard") return true // always visible
    const minRole = fp[feature as keyof FeaturePermissions] ?? "MEMBER"
    return userRank >= (ROLE_RANK[minRole] ?? 1)
  })

  return (
    <aside className="w-56 bg-white border-r flex flex-col">
      <div className="p-4 border-b">
        <div className="flex items-center gap-2 mb-0.5">
          {settings.logoUrl && (
            <Image src={settings.logoUrl} alt="Logo" width={24} height={24} className="rounded object-contain" />
          )}
          <p className="font-semibold text-sm truncate">{settings.name}</p>
        </div>
        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
      </div>
      <nav className="flex-1 p-2 space-y-1">
        {visibleNav.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors",
              pathname.startsWith(href)
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-gray-100 hover:text-foreground"
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        ))}
        {isAdmin && (
          <Link
            href="/admin/settings"
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors",
              pathname.startsWith("/admin/settings")
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-gray-100 hover:text-foreground"
            )}
          >
            <Settings className="h-4 w-4" />
            Settings
          </Link>
        )}
      </nav>
      <div className="p-2 border-t">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 text-muted-foreground"
          onClick={() => signOut({ callbackUrl: "/login" })}
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </Button>
      </div>
    </aside>
  )
}
