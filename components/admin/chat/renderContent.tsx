import React from "react"
import type { CustomEmojiItem } from "@/types/chat"

const COLOR_MAP: Record<string, string> = {
  red: "text-red-500",
  orange: "text-orange-500",
  yellow: "text-yellow-600",
  green: "text-green-600",
  blue: "text-blue-500",
  purple: "text-purple-500",
  pink: "text-pink-500",
}

// Exported so MessageInput / RichTextarea can reference the same regex
export const FORMAT_REGEX =
  /(:\w[\w-]*:)|(@\[[^\]]+\])|(\*\*(?:[^*]|\*(?!\*))+\*\*)|(\_(?:[^_])+\_)|(__(?:[^_])+__)|(~~(?:[^~])+~~)|(`[^`]+`)|(\[quote\]([\s\S]*?)\[\/quote\])|(\[c:(\w+)\](.*?)\[\/c\])|(\[([^\]]+)\]\((https?:\/\/[^\)]+)\))|(https?:\/\/[^\s<>"]+)/g

export function renderContent(
  content: string,
  customEmojis: CustomEmojiItem[] = []
): React.ReactNode {
  if (!content) return null

  const result: React.ReactNode[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null
  const re = new RegExp(FORMAT_REGEX.source, FORMAT_REGEX.flags)

  while ((match = re.exec(content)) !== null) {
    const [
      full, emojiToken, mention, bold, italic, underline, strike, code,
      quoteFull, quoteText, colorFull, colorName, colorText,
      mdLink, mdLinkText, mdLinkUrl, url,
    ] = match

    if (match.index > lastIndex) {
      result.push(<span key={lastIndex}>{content.slice(lastIndex, match.index)}</span>)
    }

    const key = match.index

    if (emojiToken) {
      const name = emojiToken.slice(1, -1)
      const emoji = customEmojis.find((e) => e.name === name)
      if (emoji) {
        result.push(<img key={key} src={emoji.imageUrl} alt={emojiToken} title={emojiToken} className="inline h-5 w-5 object-contain" />)
      } else {
        result.push(<span key={key}>{emojiToken}</span>)
      }
    } else if (mention) {
      result.push(<span key={key} className="bg-primary/10 text-primary rounded px-1 font-medium">@{mention.slice(2, -1)}</span>)
    } else if (bold) {
      result.push(<strong key={key} className="font-semibold">{bold.slice(2, -2)}</strong>)
    } else if (italic) {
      result.push(<em key={key}>{italic.slice(1, -1)}</em>)
    } else if (underline) {
      result.push(<span key={key} className="underline">{underline.slice(2, -2)}</span>)
    } else if (strike) {
      result.push(<span key={key} className="line-through">{strike.slice(2, -2)}</span>)
    } else if (code) {
      result.push(<code key={key} className="bg-muted px-1 py-0.5 rounded text-xs font-mono">{code.slice(1, -1)}</code>)
    } else if (quoteFull) {
      result.push(
        <blockquote key={key} className="border-l-4 border-primary/40 pl-3 my-1 text-muted-foreground italic whitespace-pre-wrap">
          {quoteText}
        </blockquote>
      )
    } else if (colorFull) {
      const cls = COLOR_MAP[colorName] ?? "text-foreground"
      result.push(<span key={key} className={cls}>{colorText}</span>)
    } else if (mdLink) {
      const isImage = /\.(gif|jpg|jpeg|png|webp)(\?.*)?$/i.test(mdLinkUrl) || mdLinkUrl.includes("tenor.com") || mdLinkUrl.includes("giphy.com")
      if (isImage) {
        result.push(<img key={key} src={mdLinkUrl} alt={mdLinkText} className="max-h-48 rounded mt-1 block" />)
      } else {
        result.push(
          <a key={key} href={mdLinkUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline hover:no-underline">
            {mdLinkText}
          </a>
        )
      }
    } else if (url) {
      const isImage = /\.(gif|jpg|jpeg|png|webp)(\?.*)?$/i.test(url) || url.includes("tenor.com") || url.includes("giphy.com")
      if (isImage) {
        result.push(<img key={key} src={url} alt="image" className="max-h-48 rounded mt-1 block" />)
      } else {
        result.push(
          <a key={key} href={url} target="_blank" rel="noopener noreferrer" className="text-primary underline hover:no-underline break-all">
            {url}
          </a>
        )
      }
    } else {
      result.push(<span key={key}>{full}</span>)
    }

    lastIndex = match.index + full.length
  }

  if (lastIndex < content.length) {
    result.push(<span key={lastIndex}>{content.slice(lastIndex)}</span>)
  }

  return <>{result}</>
}
