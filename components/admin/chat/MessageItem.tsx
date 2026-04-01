"use client"

import React, { useRef, useEffect } from "react"
import { useState } from "react"
import Image from "next/image"
import { SmilePlus, Reply, Pin, Pencil, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import EmojiPickerPopover from "./EmojiPickerPopover"
import { renderContent } from "./renderContent"
import type { MessageWithMeta, CustomEmojiItem, ReactionGroup } from "@/types/chat"
import { cn } from "@/lib/utils"

/** True if the string contains any HTML tags — used to pick render path */
function isHtml(str: string) { return /<[a-z][\s\S]*>/i.test(str) }

interface Props {
  message: MessageWithMeta
  currentUser: { id: string; role: string }
  customEmojis: CustomEmojiItem[]
  isGrouped: boolean
  onReply: () => void
  onReact: (emoji: string) => void
  onPin: () => void
  onEdit: (content: string) => void
  onDelete: () => void
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
}


export default function MessageItem({
  message,
  currentUser,
  customEmojis,
  isGrouped,
  onReply,
  onReact,
  onPin,
  onEdit,
  onDelete,
}: Props) {
  const [editing, setEditing] = useState(false)
  const [hovering, setHovering] = useState(false)
  const editRef = useRef<HTMLDivElement>(null)

  // Populate edit editor when entering edit mode
  useEffect(() => {
    if (editing && editRef.current) {
      editRef.current.innerHTML = message.content
      editRef.current.focus()
      // Move cursor to end
      const range = document.createRange()
      range.selectNodeContents(editRef.current)
      range.collapse(false)
      const sel = window.getSelection()
      sel?.removeAllRanges()
      sel?.addRange(range)
    }
  }, [editing, message.content])

  const isOwn = message.authorId === currentUser.id
  const isAdmin = currentUser.role === "ADMIN"
  const isDeleted = !!message.deletedAt

  function handleEditSubmit() {
    const html = editRef.current?.innerHTML ?? ""
    if (html && html !== message.content) {
      onEdit(html)
    }
    setEditing(false)
  }

  return (
    <div
      className={cn(
        "relative group flex gap-2 px-1 rounded hover:bg-accent/50",
        isGrouped ? "py-0.5" : "pt-3 pb-0.5",
        isOwn && "flex-row-reverse"
      )}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      {/* Avatar or spacer */}
      <div className="w-8 shrink-0">
        {!isGrouped && (
          message.author.avatar
            ? <Image src={message.author.avatar} alt={message.author.name} width={32} height={32} className="h-8 w-8 rounded-full object-cover" />
            : <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-semibold">
                {message.author.name[0].toUpperCase()}
              </div>
        )}
      </div>

      <div className={cn("flex-1 min-w-0", isOwn && "flex flex-col items-end")}>
        {!isGrouped && (
          <div className={cn("flex items-baseline gap-2 mb-0.5", isOwn && "flex-row-reverse")}>
            {!isOwn && <span className="font-semibold text-sm">{message.author.name}</span>}
            <span className="text-xs text-muted-foreground">{formatTime(message.createdAt)}</span>
            {message.editedAt && !isDeleted && (
              <span className="text-xs text-muted-foreground">(edited)</span>
            )}
          </div>
        )}

        {editing ? (
          <div className="space-y-1 w-full">
            <div
              ref={editRef}
              contentEditable
              suppressContentEditableWarning
              className="text-sm min-h-[60px] border rounded px-3 py-2 focus:outline-none leading-relaxed [&_ul]:list-disc [&_ul]:pl-5 [&_a]:text-primary [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:pl-3 [&_blockquote]:opacity-70 [&_blockquote]:italic"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleEditSubmit() }
                if (e.key === "Escape") setEditing(false)
              }}
            />
            <div className="flex gap-2 text-xs">
              <Button size="sm" className="h-6 text-xs" onClick={handleEditSubmit}>Save</Button>
              <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => setEditing(false)}>Cancel</Button>
            </div>
          </div>
        ) : (
          <div className={cn(
            "text-sm leading-relaxed break-words [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_a]:text-primary [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:pl-3 [&_blockquote]:opacity-70 [&_blockquote]:italic [&_img]:max-h-48 [&_img]:rounded [&_img]:mt-1",
            isOwn && !isDeleted && "bg-primary/15 rounded-2xl rounded-tr-sm px-3 py-2 max-w-[80%]"
          )}>
            {isDeleted
              ? <span className="italic text-muted-foreground">This message was deleted.</span>
              : isHtml(message.content)
                ? <span dangerouslySetInnerHTML={{ __html: message.content }} />
                : renderContent(message.content, customEmojis)
            }
          </div>
        )}

        {/* Reactions */}
        {message.reactions.length > 0 && !isDeleted && (
          <div className={cn("flex flex-wrap gap-1 mt-1", isOwn && "justify-end")}>
            {message.reactions.map((r: ReactionGroup) => (
              <button
                key={r.emoji}
                onClick={() => onReact(r.emoji)}
                className={cn(
                  "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs border transition-colors",
                  r.userIds.includes(currentUser.id)
                    ? "bg-primary/10 border-primary/30"
                    : "bg-muted border-gray-200 hover:bg-accent"
                )}
              >
                <span>{r.emoji}</span>
                <span>{r.count}</span>
              </button>
            ))}
          </div>
        )}

        {/* Reply count */}
        {(message.replyCount ?? 0) > 0 && !isDeleted && (
          <button
            onClick={onReply}
            className="text-xs text-primary hover:underline mt-0.5"
          >
            {message.replyCount} {message.replyCount === 1 ? "reply" : "replies"}
          </button>
        )}
      </div>

      {/* Hover actions */}
      {!isDeleted && hovering && (
        <div className={cn(
          "absolute top-1 flex items-center gap-0.5 bg-card border rounded shadow-sm z-10",
          isOwn ? "left-2" : "right-2"
        )}>
          <EmojiPickerPopover customEmojis={customEmojis} onSelect={onReact}>
            <Button variant="ghost" size="icon" className="h-6 w-6" title="React">
              <SmilePlus className="h-3.5 w-3.5" />
            </Button>
          </EmojiPickerPopover>
          <Button variant="ghost" size="icon" className="h-6 w-6" title="Reply in thread" onClick={onReply}>
            <Reply className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6" title="Pin message" onClick={onPin}>
            <Pin className="h-3.5 w-3.5" />
          </Button>
          {isOwn && !isDeleted && (
            <Button variant="ghost" size="icon" className="h-6 w-6" title="Edit" onClick={() => setEditing(true)}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          )}
          {(isOwn || isAdmin) && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-destructive hover:text-destructive"
              title="Delete"
              onClick={onDelete}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
