import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import AvailabilityManager from "@/components/admin/AvailabilityManager"

export default async function AvailabilityPage() {
  const session = await auth()
  if (!session) redirect("/login")

  return (
    <div className="max-w-xl space-y-4">
      <div>
        <h1 className="text-2xl font-bold">My Availability</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Block out dates when you{"'"}re unavailable to be scheduled. Click any future date to mark it, click again to remove.
        </p>
      </div>
      <AvailabilityManager userId={session.user.id as string} />
    </div>
  )
}
