import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import { notFound } from "next/navigation"
import UserProfile from "@/components/admin/UserProfile"

export default async function UserProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  const sessionRole = (session?.user?.role as string) ?? "MEMBER"
  const sessionId = (session?.user?.id as string) ?? ""

  const [user, allTeams, allMemberCategories, allMinistries, ministrySetting] = await Promise.all([
    db.user.findUnique({
      where: { id },
      select: {
        id: true, name: true, email: true, role: true, phone: true,
        avatar: true, birthday: true, address: true, gender: true,
        socialProfiles: true, createdAt: true, canViewGiving: true,
        memberCategory: { select: { id: true, name: true, color: true } },
        ministry: { select: { id: true, name: true, color: true } },
        teamMemberships: {
          include: { team: { select: { id: true, name: true } } },
        },
        groupMemberships: {
          include: { group: { select: { id: true, name: true } } },
          orderBy: { joinedAt: "desc" },
        },
        familyMemberships: {
          include: {
            family: {
              include: {
                members: {
                  include: { user: { select: { id: true, name: true, avatar: true } } },
                  orderBy: { createdAt: "asc" },
                },
              },
            },
          },
          orderBy: { createdAt: "asc" },
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
        eventRsvps: {
          include: { event: { select: { id: true, title: true, startDate: true } } },
          orderBy: { createdAt: "desc" },
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
    db.memberCategory.findMany({ orderBy: { name: "asc" } }),
    db.ministry.findMany({ orderBy: { name: "asc" } }),
    db.ministrySetting.upsert({
      where: { id: "default" },
      create: { id: "default", name: "Ordinary Ministry" },
      update: {},
    }),
  ])

  // Fetch giving history — admin always sees it; user sees their own only
  const canSeeGiving = sessionRole === "ADMIN" || sessionId === id
  const givingHistory = canSeeGiving && user ? await db.offering.findMany({
    where: { OR: [{ userId: id }, { donorEmail: user.email }] },
    include: { category: { select: { name: true, color: true } } },
    orderBy: { createdAt: "desc" },
  }) : []

  if (!user) notFound()

  const serializedGiving = givingHistory.map(o => ({
    ...o,
    createdAt: o.createdAt.toISOString(),
  }))

  return (
    <UserProfile
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      user={user as any}
      allTeams={allTeams}
      allMemberCategories={allMemberCategories}
      allMinistries={allMinistries}
      sessionRole={sessionRole}
      sessionId={sessionId}
      timezone={ministrySetting.timezone}
      givingHistory={serializedGiving}
    />
  )
}
