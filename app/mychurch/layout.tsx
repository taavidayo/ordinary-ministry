import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import AdminNav from "@/components/admin/AdminNav"
import NotificationBell from "@/components/admin/NotificationBell"

const DEFAULT_FEATURES = {
  services: "VISITOR", teams: "MEMBER", groups: "MEMBER", users: "LEADER",
  offerings: "LEADER", sermons: "VISITOR", events: "VISITOR", chat: "VISITOR",
  pages: "LEADER",
}

function initials(name?: string | null) {
  if (!name) return "?"
  return name.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2)
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session) redirect("/login")

  const [raw, dbUser] = await Promise.all([
    db.ministrySetting.upsert({
      where: { id: "default" },
      create: { id: "default", name: "Ordinary Ministry" },
      update: {},
    }),
    db.user.findUnique({
      where: { id: session.user.id },
      select: { avatar: true, name: true },
    }),
  ])

  const perms = raw.permissions as { features?: Record<string, string> } | null
  const featurePermissions = { ...DEFAULT_FEATURES, ...(perms?.features ?? {}) }

  const settings = {
    name: raw.name,
    logoUrl: raw.logoUrl,
    featurePermissions,
  }

  const userName = dbUser?.name ?? null
  const userAvatar = dbUser?.avatar ?? null

  return (
    <div className="flex min-h-screen bg-background">
      <AdminNav
        user={{ ...session.user, avatar: userAvatar }}
        settings={settings}
      />
      <div className="flex-1 flex flex-col overflow-hidden min-h-screen">
        {/* Desktop header */}
        <div className="hidden md:flex items-center justify-end gap-2 h-11 px-4 border-b bg-card shrink-0">
          <NotificationBell />
          <div className="w-px h-5 bg-border" />
          <Link
            href={`/mychurch/users/${session.user.id}`}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <span className="truncate max-w-[160px]">{userName ?? session.user.email}</span>
            {userAvatar ? (
              <Image
                src={userAvatar}
                alt={userName ?? "Avatar"}
                width={24}
                height={24}
                className="rounded-full object-cover h-6 w-6 shrink-0"
              />
            ) : (
              <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-semibold text-primary shrink-0">
                {initials(userName)}
              </div>
            )}
          </Link>
        </div>
        <main className="flex-1 overflow-auto p-6 pt-[72px] md:pt-6">{children}</main>
      </div>
    </div>
  )
}
