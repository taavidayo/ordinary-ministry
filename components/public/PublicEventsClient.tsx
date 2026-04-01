"use client"

import { useState } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { Users, Check, ClipboardList } from "lucide-react"
// currentUserId kept for future personalization; not used in RSVP flow

interface Event {
  id: string
  title: string
  description: string | null
  startDate: Date
  endDate: Date | null
  location: string | null
  rsvpEnabled: boolean
  form: { id: string } | null
}


function EventCard({
  ev,
  isRsvped: initialRsvped,
  currentUserId,
}: {
  ev: Event
  isRsvped: boolean
  currentUserId?: string
}) {
  const [rsvped, setRsvped] = useState(initialRsvped)
  const [toggling, setToggling] = useState(false)

  async function rsvp() {
    setToggling(true)
    const res = await fetch(`/api/events/${ev.id}/rsvp`, { method: "POST" })
    setToggling(false)
    if (res.ok) {
      const data = await res.json()
      setRsvped(data.action === "added")
      if (data.action === "added") toast.success("You're going!")
      else toast.success("RSVP removed")
    } else {
      toast.error("Something went wrong. Please try again.")
    }
  }

  return (
    <div className="border rounded-lg p-5 space-y-2">
      <h2 className="text-xl font-semibold">{ev.title}</h2>
      <p className="text-sm text-muted-foreground">
        {new Date(ev.startDate).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
        {ev.endDate && ` – ${new Date(ev.endDate).toLocaleDateString()}`}
        {ev.location && ` · ${ev.location}`}
      </p>
      {ev.description && <p className="text-sm">{ev.description}</p>}

      <div className="flex flex-wrap gap-2 pt-1">
        {ev.rsvpEnabled && (
          <button
            onClick={rsvp}
            disabled={toggling}
            className={`inline-flex items-center gap-1.5 text-sm font-medium border rounded-full px-4 py-1.5 transition-colors disabled:opacity-50 ${
              rsvped
                ? "text-green-700 border-green-200 bg-green-50 hover:bg-green-100"
                : "hover:bg-muted"
            }`}
          >
            {rsvped ? <Check className="h-4 w-4" /> : <Users className="h-4 w-4" />}
            {rsvped ? "You're going!" : "RSVP"}
          </button>
        )}
        {ev.form && (
          <Link
            href={`/events/${ev.id}/signup`}
            className="inline-flex items-center gap-1.5 text-sm font-medium border rounded-full px-4 py-1.5 hover:bg-muted transition-colors"
          >
            <ClipboardList className="h-4 w-4" /> Sign Up
          </Link>
        )}
      </div>
    </div>
  )
}

export default function PublicEventsClient({
  events,
  currentUserId,
  myRsvpEventIds = [],
}: {
  events: Event[]
  currentUserId?: string
  myRsvpEventIds?: string[]
}) {
  return (
    <div className="space-y-4">
      {events.length === 0 && <p className="text-muted-foreground">No upcoming events.</p>}
      {events.map((ev) => (
        <EventCard
          key={ev.id}
          ev={ev}
          isRsvped={myRsvpEventIds.includes(ev.id)}
          currentUserId={currentUserId}
        />
      ))}
    </div>
  )
}
