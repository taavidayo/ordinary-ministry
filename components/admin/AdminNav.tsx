"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  CalendarDays,
  Handshake,
  Heart,
  Tv2,
  CalendarCheck,
  Settings,
  LogOut,
  MessageSquare,
  Globe,
  Sun,
  Moon,
  Monitor,
  UsersRound,
  Smile,
  ArrowLeft,
  ChevronDown,
} from "lucide-react"
import { useTheme } from "next-themes"
import { ROLE_RANK } from "@/lib/category-colors"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface FeaturePermissions {
  services?: string
  teams?: string
  groups?: string
  users?: string
  offerings?: string
  sermons?: string
  events?: string
  chat?: string
  pages?: string
}

interface NavSettings {
  name: string
  logoUrl?: string | null
  featurePermissions: FeaturePermissions
}

interface Props {
  user: { id?: string; name?: string | null; email?: string | null; role?: string; avatar?: string | null }
  settings: NavSettings
}

const ALL_NAV_ITEMS = [
  { href: "/mychurch/dashboard",  label: "Dashboard",  icon: LayoutDashboard, feature: "dashboard"  },
  { href: "/mychurch/services",   label: "Services",   icon: CalendarDays,    feature: "services"   },
  { href: "/mychurch/teams",      label: "Teams",      icon: Handshake,       feature: "teams"      },
  { href: "/mychurch/groups",     label: "Groups",     icon: UsersRound,      feature: "groups"     },
  { href: "/mychurch/chat",       label: "Chat",       icon: MessageSquare,   feature: "chat"       },
  { href: "/mychurch/users",      label: "Church",     icon: Smile,           feature: "users"      },
  { href: "/mychurch/giving",     label: "Giving",     icon: Heart,           feature: "offerings"  },
  { href: "/mychurch/sermons",    label: "Sermons",    icon: Tv2,             feature: "sermons"    },
  { href: "/mychurch/events",     label: "Events",     icon: CalendarCheck,   feature: "events"     },
  { href: "/mychurch/pages",      label: "Pages",      icon: Globe,           feature: "pages"      },
]

function initials(name?: string | null) {
  if (!name) return "?"
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)
}

/** Returns the label for the current section, or "Menu" as default. */
function getSectionLabel(pathname: string): string {
  for (const item of ALL_NAV_ITEMS) {
    if (pathname === item.href || pathname.startsWith(item.href + "/")) {
      return item.label
    }
  }
  if (pathname === "/mychurch/settings" || pathname.startsWith("/mychurch/settings/")) {
    return "Admin Settings"
  }
  return "Menu"
}

/** Returns the nav item that is a parent of the current pathname (i.e. we're on a sub-page). */
function getParentNav(pathname: string): typeof ALL_NAV_ITEMS[number] | null {
  for (const item of ALL_NAV_ITEMS) {
    if (pathname !== item.href && pathname.startsWith(item.href + "/")) {
      return item
    }
  }
  return null
}

function NavLink({
  href, label, icon: Icon, active, collapsed,
}: {
  href: string; label: string; icon: React.ElementType; active: boolean; collapsed?: boolean
}) {
  return (
    <Link
      href={href}
      title={collapsed ? label : undefined}
      className={cn(
        "flex items-center gap-2.5 py-2 rounded-md text-sm transition-colors",
        collapsed ? "justify-center px-2" : "px-3",
        active
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-accent hover:text-foreground"
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {!collapsed && label}
    </Link>
  )
}

export default function AdminNav({ user, settings }: Props) {
  const pathname = usePathname()
  const userRole = user.role ?? "MEMBER"
  const userRank = ROLE_RANK[userRole] ?? 1
  const isAdmin = userRole === "ADMIN"

  const { theme, setTheme } = useTheme()

  const [collapsed, setCollapsed] = useState(false)
  useEffect(() => {
    const stored = localStorage.getItem("sidebar-collapsed")
    if (stored === "true") setCollapsed(true)
  }, [])
  function toggleCollapse() {
    const next = !collapsed
    setCollapsed(next)
    localStorage.setItem("sidebar-collapsed", String(next))
  }

  const fp = settings.featurePermissions
  const visibleNav = ALL_NAV_ITEMS.filter(({ feature }) => {
    if (feature === "dashboard") return true
    const minRole = fp[feature as keyof FeaturePermissions] ?? "MEMBER"
    return userRank >= (ROLE_RANK[minRole] ?? 1)
  })

  const hasLogo = !!settings.logoUrl
  const parentNav = getParentNav(pathname)
  const sectionLabel = getSectionLabel(pathname)

  const themeLabel = theme === "dark" ? "Dark mode" : theme === "system" ? "System" : "Light mode"
  const ThemeIcon = theme === "dark" ? Moon : theme === "system" ? Monitor : Sun

  return (
    <>
      {/* ── Mobile top bar ── */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 h-12 bg-card border-b flex items-center px-3 gap-3 shrink-0">
        {parentNav ? (
          /* Sub-page: show back link + user avatar */
          <>
            <Link
              href={parentNav.href}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4 shrink-0" />
              {parentNav.label}
            </Link>
            <div className="flex-1" />
          </>
        ) : (
          /* Main page: section name as dropdown trigger */
          <>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-1.5 text-sm font-medium hover:text-foreground text-foreground transition-colors">
                  {sectionLabel}
                  <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-52">
                {visibleNav.map(({ href, label, icon: Icon }) => (
                  <DropdownMenuItem key={href} asChild>
                    <Link href={href} className="flex items-center gap-2.5">
                      <Icon className="h-4 w-4 shrink-0" />
                      {label}
                    </Link>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                {isAdmin && (
                  <DropdownMenuItem asChild>
                    <Link href="/mychurch/settings" className="flex items-center gap-2.5">
                      <Settings className="h-4 w-4 shrink-0" />
                      Admin Settings
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  onClick={() => setTheme(theme === "light" ? "dark" : theme === "dark" ? "system" : "light")}
                  className="flex items-center gap-2.5"
                >
                  <ThemeIcon className="h-4 w-4 shrink-0" />
                  {themeLabel}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="flex items-center gap-2.5 text-destructive focus:text-destructive"
                >
                  <LogOut className="h-4 w-4 shrink-0" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <div className="flex-1" />
          </>
        )}

        {/* User avatar — always far right */}
        <Link
          href={user.id ? `/mychurch/users/${user.id}` : "/mychurch/users"}
          className="shrink-0"
        >
          {user.avatar ? (
            <Image
              src={user.avatar}
              alt={user.name ?? "Avatar"}
              width={28}
              height={28}
              className="rounded-full object-cover h-7 w-7"
            />
          ) : (
            <div className="h-7 w-7 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-semibold text-primary">
              {initials(user.name)}
            </div>
          )}
        </Link>
      </div>

      {/* ── Desktop sidebar ── */}
      <aside className={cn(
        "hidden md:flex flex-col shrink-0 bg-card border-r min-h-screen transition-all duration-200",
        collapsed ? "w-14" : "w-48"
      )}>
        {/* Logo / name — click to collapse/expand */}
        <button
          onClick={toggleCollapse}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={cn("border-b p-2 shrink-0 w-full text-left hover:bg-accent/30 transition-colors", collapsed && "flex justify-center")}
        >
          <div className={cn("flex items-center gap-2.5 px-1 py-1", collapsed && "justify-center")}>
            {!collapsed && (hasLogo ? (
              <Image
                src={settings.logoUrl!}
                alt="Logo"
                width={120}
                height={16}
                className="h-5 w-auto max-w-full object-contain dark:invert flex-1 min-w-0"
              />
            ) : (
              <>
                <div className="h-4 w-4 rounded bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-[9px] font-bold text-primary leading-none">
                    {settings.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <span className="font-semibold text-sm truncate flex-1 min-w-0">{settings.name}</span>
              </>
            ))}
            {collapsed && (
              <div className="h-4 w-4 rounded bg-primary/10 flex items-center justify-center">
                <span className="text-[9px] font-bold text-primary leading-none">
                  {settings.name.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
          </div>
        </button>

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {visibleNav.map(({ href, label, icon }) => (
            <NavLink
              key={href}
              href={href}
              label={label}
              icon={icon}
              active={pathname.startsWith(href)}
              collapsed={collapsed}
            />
          ))}
        </nav>

        {/* Bottom: admin settings + theme toggle + sign out */}
        <div className="border-t p-2 space-y-0.5">
          {isAdmin && (
            <NavLink
              href="/mychurch/settings"
              label="Admin Settings"
              icon={Settings}
              active={pathname.startsWith("/mychurch/settings")}
              collapsed={collapsed}
            />
          )}

          <button
            onClick={() => setTheme(theme === "light" ? "dark" : theme === "dark" ? "system" : "light")}
            title={collapsed ? themeLabel : undefined}
            className={cn(
              "flex items-center gap-2.5 py-2 w-full rounded-md text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors",
              collapsed ? "justify-center px-2" : "px-3"
            )}
          >
            <ThemeIcon className="h-4 w-4 shrink-0" />
            {!collapsed && themeLabel}
          </button>

          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            title={collapsed ? "Sign out" : undefined}
            className={cn(
              "flex items-center gap-2.5 py-2 w-full rounded-md text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors",
              collapsed ? "justify-center px-2" : "px-3"
            )}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {!collapsed && "Sign out"}
          </button>
        </div>
      </aside>
    </>
  )
}
