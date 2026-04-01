export interface ReactionGroup {
  emoji: string
  count: number
  userIds: string[]
}

export interface MessageWithMeta {
  id: string
  channelId: string
  authorId: string
  content: string
  threadId: string | null
  editedAt: string | null
  deletedAt: string | null
  createdAt: string
  author: {
    id: string
    name: string
    avatar: string | null
  }
  replyCount?: number
  reactions: ReactionGroup[]
}

export interface ChannelSummary {
  id: string
  name: string
  icon: string | null
  description: string | null
  type: "PUBLIC" | "PRIVATE" | "TEAM" | "GROUP"
  teamId: string | null
  groupId: string | null
  createdById: string
  createdAt: string
  archivedAt: string | null
  isMember: boolean
  categoryId: string | null
  order: number
}

export interface ChannelDetail extends ChannelSummary {
  members: {
    userId: string
    joinedAt: string
    user: { id: string; name: string; avatar: string | null }
  }[]
}

export interface PinnedMessage {
  channelId: string
  messageId: string
  pinnedById: string
  createdAt: string
  message: MessageWithMeta
}

export interface ChannelResourceItem {
  id: string
  channelId: string
  title: string
  url: string
  addedById: string
  createdAt: string
  addedBy: { name: string }
}

export interface CustomEmojiItem {
  id: string
  name: string
  imageUrl: string
}

export interface PinnedBannerItem {
  messageId: string
  content: string
  authorName: string
}

export interface ChatCategoryItem {
  id: string
  name: string
  order: number
  collapsed: boolean
}
