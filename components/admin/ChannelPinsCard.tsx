"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { Pin, MessageSquare } from "lucide-react"

interface PinnedMessage {
  channelId: string
  messageId: string
  message: {
    id: string
    content: string
    author: { id: string; name: string; avatar: string | null }
    createdAt: string
  }
}

interface Props {
  channelId: string
  channelName?: string
}

export default function ChannelPinsCard({ channelId, channelName }: Props) {
  const [pins, setPins] = useState<PinnedMessage[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/channels/${channelId}/pins`)
      .then((r) => r.json())
      .then((data) => { setPins(Array.isArray(data) ? data : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [channelId])

  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base flex items-center gap-2">
          <Pin className="h-4 w-4" /> Pinned Messages
        </CardTitle>
        {channelName && (
          <Link href={`/mychurch/chat/${channelId}`} className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
            <MessageSquare className="h-3.5 w-3.5" /> View Chat
          </Link>
        )}
      </CardHeader>
      <CardContent className="space-y-2">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : pins.length === 0 ? (
          <p className="text-sm text-muted-foreground">No pinned messages.</p>
        ) : (
          <div className="divide-y">
            {pins.slice(0, 5).map((pin) => (
              <div key={pin.messageId} className="py-2">
                <p className="text-xs font-medium text-muted-foreground mb-0.5">{pin.message.author.name}</p>
                <p className="text-sm line-clamp-2">{pin.message.content}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
