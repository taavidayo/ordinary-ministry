import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import SettingsManager from "@/components/admin/SettingsManager"

function maskKey(key: string | null): string | null {
  if (!key) return null
  return key.slice(0, 8) + "****" + key.slice(-4)
}

export default async function SettingsPage() {
  const session = await auth()
  if ((session?.user?.role as string) !== "ADMIN") redirect("/mychurch/dashboard")

  const settings = await db.ministrySetting.upsert({
    where: { id: "default" },
    create: { id: "default", name: "Ordinary Ministry" },
    update: {},
  })

  const masked = {
    ...settings,
    stripeSecretKey: maskKey(settings.stripeSecretKey),
    stripeWebhookSecret: maskKey(settings.stripeWebhookSecret),
  }

  return (
    <div className="space-y-4 max-w-3xl">
      <h1 className="text-2xl font-bold">Admin Settings</h1>
      <SettingsManager settings={masked} />
    </div>
  )
}
