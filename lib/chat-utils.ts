import type { ReactionGroup } from "@/types/chat"

interface RawReaction {
  messageId: string
  userId: string
  emoji: string
}

export function aggregateReactions(reactions: RawReaction[]): ReactionGroup[] {
  const map = new Map<string, { count: number; userIds: string[] }>()
  for (const r of reactions) {
    const existing = map.get(r.emoji)
    if (existing) {
      existing.count++
      existing.userIds.push(r.userId)
    } else {
      map.set(r.emoji, { count: 1, userIds: [r.userId] })
    }
  }
  return Array.from(map.entries()).map(([emoji, { count, userIds }]) => ({
    emoji,
    count,
    userIds,
  }))
}
