"use client"

import { CalendarOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import AvailabilityManager from "@/components/admin/AvailabilityManager"

interface Props {
  userId: string
}

export default function AvailabilitySheet({ userId }: Props) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">
          <CalendarOff className="h-4 w-4 mr-1" /> My Availability
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>My Availability</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Click a future date to block it. Click a blocked date to remove it.
          </p>
        </DialogHeader>
        <AvailabilityManager userId={userId} />
      </DialogContent>
    </Dialog>
  )
}
