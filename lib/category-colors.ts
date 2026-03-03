// Full Tailwind class strings kept as literals so the compiler can detect them.
export const CATEGORY_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  gray:   { bg: "bg-gray-100",   text: "text-gray-700",   dot: "bg-gray-400" },
  red:    { bg: "bg-red-100",    text: "text-red-700",    dot: "bg-red-400" },
  orange: { bg: "bg-orange-100", text: "text-orange-700", dot: "bg-orange-400" },
  yellow: { bg: "bg-yellow-100", text: "text-yellow-700", dot: "bg-yellow-400" },
  green:  { bg: "bg-green-100",  text: "text-green-700",  dot: "bg-green-400" },
  blue:   { bg: "bg-blue-100",   text: "text-blue-700",   dot: "bg-blue-400" },
  purple: { bg: "bg-purple-100", text: "text-purple-700", dot: "bg-purple-400" },
  pink:   { bg: "bg-pink-100",   text: "text-pink-700",   dot: "bg-pink-400" },
}

export const COLOR_OPTIONS = Object.keys(CATEGORY_COLORS)

export const ROLE_LABELS: Record<string, string> = {
  VISITOR: "Visitors",
  MEMBER:  "All Members",
  LEADER:  "Leaders & Admins",
  ADMIN:   "Admins Only",
}

export const ROLE_BADGE: Record<string, string> = {
  VISITOR: "bg-orange-100 text-orange-700",
  MEMBER:  "bg-gray-100 text-gray-600",
  LEADER:  "bg-blue-100 text-blue-700",
  ADMIN:   "bg-red-100 text-red-700",
}

// Numeric rank for permission comparisons (higher = more access)
export const ROLE_RANK: Record<string, number> = {
  VISITOR: 0,
  MEMBER:  1,
  LEADER:  2,
  ADMIN:   3,
}
