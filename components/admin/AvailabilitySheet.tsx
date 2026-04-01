"use client"

import { CalendarOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import AvailabilityManager from "@/components/admin/AvailabilityManager"

interface Props {
  userId: string
  trigger?: React.ReactNode
}

export default function AvailabilitySheet({ userId, trigger }: Props) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline">
            <CalendarOff className="h-4 w-4 mr-1" /> My Availability
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>My Availability</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Click a date to block it out. Click a blocked date to remove it. Use the settings icon to set scheduling preferences.
          </p>
        </DialogHeader>
        <AvailabilityManager userId={userId} />
      </DialogContent>
    </Dialog>
  )
}
