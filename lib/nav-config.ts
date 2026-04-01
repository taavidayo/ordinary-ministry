// Navigation configuration types and helpers

export interface NavSocialLink {
  platform: string
  url: string
  icon: "instagram" | "youtube" | "twitter" | "facebook" | "linkedin" | "tiktok" | "link"
}

/** A single item in the nav tree: a page, a dropdown folder, or a custom link */
export interface NavTreeItem {
  id: string           // page slug, "folder_abc123" for dropdowns, "link_abc123" for links
  type: "page" | "folder" | "link"
  label?: string       // custom label (required for folders/links, optional override for pages)
  children?: string[]  // child page slugs (for page and folder types)
  href?: string        // only for link type
}

export interface NavConfigData {
  linkSpacing: number
  showSocialIcons: boolean
  socialLinks: NavSocialLink[]
  fixed: boolean
  overlay: boolean      // float nav over page content (top section bleeds behind nav)
  overlayBg: string     // nav background when in overlay mode (default transparent)
  showDropdownArrow: boolean  // show chevron arrow on nav items with dropdowns
  height: number
  border: {
    show: boolean
    color: string
    width: number
    style: "solid" | "dashed" | "dotted"
  }
  shadow: {
    show: boolean
    color: string
    opacity: number
    blur: number
    spread: number
    distance: number
  }
  colorMode: "static" | "adaptive"
  staticBg: string
  staticText: string
  adaptiveLightBg: string
  adaptiveLightText: string
  adaptiveDarkBg: string
  adaptiveDarkText: string
  dropdownBg: string        // dropdown background; "transparent" or hex color
  dropdownRadius: number    // dropdown border-radius in px
  dropdownBorder: {
    show: boolean
    color: string
    width: number
    style: "solid" | "dashed" | "dotted"
  }
  navTree: NavTreeItem[]    // ordered nav structure (pages + folders)
}

export const DEFAULT_NAV_CONFIG: NavConfigData = {
  linkSpacing: 24,
  showSocialIcons: false,
  socialLinks: [],
  fixed: true,
  overlay: false,
  overlayBg: "transparent",
  showDropdownArrow: false,
  height: 64,
  border: { show: false, color: "#e5e7eb", width: 1, style: "solid" },
  shadow: { show: false, color: "#000000", opacity: 20, blur: 8, spread: 0, distance: 4 },
  colorMode: "static",
  staticBg: "#ffffff",
  staticText: "#111827",
  adaptiveLightBg: "#ffffff",
  adaptiveLightText: "#111827",
  adaptiveDarkBg: "#111827",
  adaptiveDarkText: "#ffffff",
  dropdownBg: "#ffffff",
  dropdownRadius: 8,
  dropdownBorder: { show: true, color: "#e5e7eb", width: 1, style: "solid" },
  navTree: [],
}

export function parseNavConfig(json: string): NavConfigData {
  try {
    return { ...DEFAULT_NAV_CONFIG, ...JSON.parse(json) }
  } catch {
    return { ...DEFAULT_NAV_CONFIG }
  }
}

// ── Public nav rendering types ────────────────────────────────────────────────

export interface PublicNavItem {
  id: string
  type: "page" | "folder" | "link"
  slug?: string      // pages only
  label: string      // display label
  href?: string      // pages and links
  children: PublicNavItem[]
}

/** Build the public nav from navTree + a page lookup map */
export function buildPublicNavFromTree(
  tree: NavTreeItem[],
  pageMap: Map<string, { title: string; navLabel?: string | null }>
): PublicNavItem[] {
  return tree.map(item => {
    if (item.type === "link") {
      return {
        id: item.id,
        type: "link" as const,
        label: item.label ?? "Link",
        href: item.href ?? "#",
        children: [],
      }
    }
    if (item.type === "folder") {
      return {
        id: item.id,
        type: "folder" as const,
        label: item.label ?? "More",
        children: (item.children ?? []).map(slug => {
          const page = pageMap.get(slug)
          return {
            id: slug, type: "page" as const, slug,
            label: page?.navLabel ?? page?.title ?? slug,
            href: `/${slug === "home" ? "" : slug}`,
            children: [],
          }
        }),
      }
    }
    const page = pageMap.get(item.id)
    return {
      id: item.id,
      type: "page" as const,
      slug: item.id,
      label: item.label ?? page?.navLabel ?? page?.title ?? item.id,
      href: `/${item.id === "home" ? "" : item.id}`,
      children: (item.children ?? []).map(slug => {
        const child = pageMap.get(slug)
        return {
          id: slug, type: "page" as const, slug,
          label: child?.navLabel ?? child?.title ?? slug,
          href: `/${slug === "home" ? "" : slug}`,
          children: [],
        }
      }),
    }
  })
}

/** All page slugs referenced anywhere in the nav tree */
export function navTreePageSlugs(tree: NavTreeItem[]): Set<string> {
  const slugs = new Set<string>()
  for (const item of tree) {
    if (item.type === "page") slugs.add(item.id)
    for (const child of item.children ?? []) slugs.add(child)
  }
  return slugs
}

/** Compute perceived luminance (0–1) of a hex color */
export function hexLuminance(hex: string): number {
  const clean = hex.replace("#", "")
  if (clean.length < 6) return 1
  const r = parseInt(clean.slice(0, 2), 16) / 255
  const g = parseInt(clean.slice(2, 4), 16) / 255
  const b = parseInt(clean.slice(4, 6), 16) / 255
  const toLinear = (c: number) => c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b)
}

export function navBoxShadow(shadow: NavConfigData["shadow"]): string {
  if (!shadow.show) return "none"
  const alpha = (shadow.opacity / 100).toFixed(2)
  const hex = shadow.color.replace("#", "")
  const r = parseInt(hex.slice(0, 2), 16)
  const g = parseInt(hex.slice(2, 4), 16)
  const b = parseInt(hex.slice(4, 6), 16)
  return `0 ${shadow.distance}px ${shadow.blur}px ${shadow.spread}px rgba(${r},${g},${b},${alpha})`
}
