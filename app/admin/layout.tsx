import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"
import AdminNav from "@/components/admin/AdminNav"

const DEFAULT_FEATURES = {
  services: "VISITOR", teams: "MEMBER", users: "LEADER",
  offerings: "LEADER", sermons: "VISITOR", events: "VISITOR",
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session) redirect("/login")

  const raw = await db.ministrySetting.upsert({
    where: { id: "default" },
    create: { id: "default", name: "Ordinary Ministry" },
    update: {},
  })

  const perms = raw.permissions as { features?: Record<string, string> } | null
  const featurePermissions = { ...DEFAULT_FEATURES, ...(perms?.features ?? {}) }

  const settings = {
    name: raw.name,
    logoUrl: raw.logoUrl,
    featurePermissions,
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminNav user={session.user} settings={settings} />
      <main className="flex-1 p-6 overflow-auto">{children}</main>
    </div>
  )
}
