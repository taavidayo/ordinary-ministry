"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Link2, ExternalLink } from "lucide-react"
import Link from "next/link"

export interface PinnedLinkItem {
  id: string
  title: string
  url: string
  channelName: string
  channelId: string
}

interface Props {
  links: PinnedLinkItem[]
}

export default function PinnedLinksWidget({ links }: Props) {
  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Link2 className="h-4 w-4" />
          Pinned Links
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto">
        {links.length === 0 ? (
          <p className="text-sm text-muted-foreground">No pinned links in your channels.</p>
        ) : (
          <ul className="space-y-2">
            {links.map((item) => (
              <li key={item.id} className="flex items-start gap-2 min-w-0">
                <ExternalLink className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium hover:underline line-clamp-1 block"
                  >
                    {item.title}
                  </a>
                  <Link
                    href={`/mychurch/chat/${item.channelId}`}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    #{item.channelName}
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
