import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import SettingsManager from "@/components/admin/SettingsManager"

export default async function SettingsPage() {
  const session = await auth()
  if ((session?.user?.role as string) !== "ADMIN") redirect("/admin/dashboard")

  const settings = await db.ministrySetting.upsert({
    where: { id: "default" },
    create: { id: "default", name: "Ordinary Ministry" },
    update: {},
  })

  return (
    <div className="space-y-4 max-w-3xl">
      <h1 className="text-2xl font-bold">Settings</h1>
      <SettingsManager settings={settings} />
    </div>
  )
}
