import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import { notFound } from "next/navigation"
import UserProfile from "@/components/admin/UserProfile"

export default async function UserProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  const sessionRole = (session?.user?.role as string) ?? "MEMBER"
  const sessionId = (session?.user?.id as string) ?? ""

  const [user, allTeams, ministrySetting] = await Promise.all([
    db.user.findUnique({
      where: { id },
      select: {
        id: true, name: true, email: true, role: true, phone: true,
        avatar: true, birthday: true, address: true, gender: true,
        socialProfiles: true, createdAt: true,
        teamMemberships: {
          include: { team: { select: { id: true, name: true } } },
        },
        serviceSlots: {
          include: {
            role: { select: { name: true } },
            serviceTeam: {
              include: {
                team: { select: { name: true } },
                service: { select: { id: true, title: true, date: true } },
              },
            },
          },
          orderBy: { serviceTeam: { service: { date: "desc" } } },
        },
        profileNotes: sessionRole === "ADMIN"
          ? {
              include: { author: { select: { id: true, name: true } } },
              orderBy: { createdAt: "desc" },
            }
          : false,
      },
    }),
    db.team.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    db.ministrySetting.upsert({
      where: { id: "default" },
      create: { id: "default", name: "Ordinary Ministry" },
      update: {},
    }),
  ])

  if (!user) notFound()

  return (
    <UserProfile
      user={user as unknown as Parameters<typeof UserProfile>[0]["user"]}
      allTeams={allTeams}
      sessionRole={sessionRole}
      sessionId={sessionId}
      timezone={ministrySetting.timezone}
    />
  )
}
