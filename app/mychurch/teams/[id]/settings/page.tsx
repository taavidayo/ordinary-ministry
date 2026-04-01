import { notFound } from "next/navigation"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import TeamSettings from "@/components/admin/TeamSettings"

export default async function TeamSettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  const userRole = session?.user?.role ?? "MEMBER"

  const [team, allChannels] = await Promise.all([
    db.team.findUnique({
      where: { id },
      include: {
        members: {
          include: { user: { select: { id: true, name: true, email: true, avatar: true } } },
          orderBy: { user: { name: "asc" } },
        },
        channels: { select: { id: true, name: true, icon: true, type: true } },
      },
    }),
    db.channel.findMany({
      where: { teamId: null },
      select: { id: true, name: true, icon: true, type: true },
      orderBy: { name: "asc" },
    }),
  ])

  if (!team) notFound()

  return (
    <TeamSettings
      team={team as any}
      allChannels={allChannels}
      userRole={userRole}
    />
  )
}
