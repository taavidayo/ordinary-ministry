"use client"

import Link from "next/link"
import { cn } from "@/lib/utils"
import { CalendarCheck, CalendarDays, Music, CalendarOff } from "lucide-react"

type Tab = "schedule" | "planner" | "songs" | "availability"

interface Props {
  active: Tab
}

export default function ServicesBottomNav({ active }: Props) {
  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-card border-t flex h-16">
      <Link
        href="/mychurch/services"
        className={cn(
          "flex-1 flex flex-col items-center justify-center gap-1 text-xs transition-colors",
          active === "schedule" ? "text-primary" : "text-muted-foreground"
        )}
      >
        <CalendarCheck className="h-5 w-5" />
        My Schedule
      </Link>
      <Link
        href="/mychurch/services"
        className={cn(
          "flex-1 flex flex-col items-center justify-center gap-1 text-xs transition-colors",
          active === "planner" ? "text-primary" : "text-muted-foreground"
        )}
      >
        <CalendarDays className="h-5 w-5" />
        Planner
      </Link>
      <Link
        href="/mychurch/songs"
        className={cn(
          "flex-1 flex flex-col items-center justify-center gap-1 text-xs transition-colors",
          active === "songs" ? "text-primary" : "text-muted-foreground"
        )}
      >
        <Music className="h-5 w-5" />
        Songs
      </Link>
      <Link
        href="/mychurch/availability"
        className={cn(
          "flex-1 flex flex-col items-center justify-center gap-1 text-xs transition-colors",
          active === "availability" ? "text-primary" : "text-muted-foreground"
        )}
      >
        <CalendarOff className="h-5 w-5" />
        Availability
      </Link>
    </div>
  )
}
