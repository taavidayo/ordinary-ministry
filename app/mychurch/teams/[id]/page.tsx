import { notFound } from "next/navigation"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import TeamDashboard from "@/components/admin/TeamDashboard"

export default async function TeamDashboardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  const userRole = session?.user?.role ?? "MEMBER"
  const currentUserId = session?.user?.id ?? ""

  const [team, allChannels] = await Promise.all([
  db.team.findUnique({
    where: { id },
    include: {
      channels: { select: { id: true, name: true } },
      members: {
        include: {
          user: {
            select: { id: true, name: true, email: true, avatar: true },
          },
          memberRoles: { select: { roleId: true } },
        },
      },
      roles: true,
      notes: {
        include: {
          subject: { select: { id: true, name: true } },
          author: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
      },
      taskStatuses: { orderBy: { order: "asc" } },
      tasks: {
        where: { projectId: null, parentId: null },
        include: {
          assignedTo: { select: { id: true, name: true } },
          assignees: { include: { user: { select: { id: true, name: true, avatar: true } } } },
          status: true,
          subtasks: {
            include: {
              assignedTo: { select: { id: true, name: true } },
              assignees: { include: { user: { select: { id: true, name: true, avatar: true } } } },
              status: true,
              comments: {
                include: { author: { select: { id: true, name: true, avatar: true } } },
                orderBy: { createdAt: "asc" },
              },
            },
          },
          comments: {
            include: { author: { select: { id: true, name: true, avatar: true } } },
            orderBy: { createdAt: "asc" },
          },
        },
        orderBy: { createdAt: "asc" },
      },
      projects: {
        orderBy: { createdAt: "asc" },
        include: {
          comments: {
            include: { author: { select: { id: true, name: true, avatar: true } } },
            orderBy: { createdAt: "asc" },
          },
          tasks: {
            where: { parentId: null },
            include: {
              assignedTo: { select: { id: true, name: true } },
              assignees: { include: { user: { select: { id: true, name: true, avatar: true } } } },
              status: true,
              subtasks: {
                include: {
                  assignedTo: { select: { id: true, name: true } },
                  assignees: { include: { user: { select: { id: true, name: true, avatar: true } } } },
                  status: true,
                  comments: {
                    include: { author: { select: { id: true, name: true, avatar: true } } },
                    orderBy: { createdAt: "asc" },
                  },
                },
              },
              comments: {
                include: { author: { select: { id: true, name: true, avatar: true } } },
                orderBy: { createdAt: "asc" },
              },
            },
            orderBy: { createdAt: "asc" },
          },
        },
      },
      trainingModules: {
        include: {
          steps: {
            include: {
              completions: true,
            },
            orderBy: { order: "asc" },
          },
        },
        orderBy: { order: "asc" },
      },
      checklists: {
        orderBy: { order: "asc" },
        include: {
          items: {
            include: { role: { select: { id: true, name: true } } },
            orderBy: { order: "asc" },
          },
          category: { select: { id: true, name: true, color: true } },
        },
      },
    },
  }),
  db.channel.findMany({
    where: { archivedAt: null },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  }),
  ])

  if (!team) notFound()

  // Query ServiceSlot data for analytics
  const serviceSlots = await db.serviceSlot.findMany({
    where: {
      serviceTeam: {
        teamId: id,
      },
    },
    select: {
      userId: true,
      role: { select: { name: true } },
      serviceTeam: {
        select: {
          service: {
            select: {
              date: true,
              title: true,
              category: { select: { name: true } },
            },
          },
        },
      },
    },
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (
    <TeamDashboard
      team={team as any}
      serviceHistory={serviceSlots}
      userRole={userRole}
      currentUserId={currentUserId}
      allChannels={allChannels}
    />
  )
}
