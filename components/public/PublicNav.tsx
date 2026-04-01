"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState, useEffect, useRef } from "react"
import { Menu, X, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  type NavConfigData,
  type PublicNavItem,
  navBoxShadow,
} from "@/lib/nav-config"

function SocialIcon({ icon }: { icon: string }) {
  const cls = "h-4 w-4"
  if (icon === "instagram") return (
    <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
    </svg>
  )
  if (icon === "youtube") return (
    <svg className={cls} viewBox="0 0 24 24" fill="currentColor">
      <path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46A2.78 2.78 0 0 0 1.46 6.42 29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58 2.78 2.78 0 0 0 1.95 1.96C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.96-1.96A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z"/><polygon fill="white" points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02"/>
    </svg>
  )
  if (icon === "twitter") return (
    <svg className={cls} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
    </svg>
  )
  if (icon === "facebook") return (
    <svg className={cls} viewBox="0 0 24 24" fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  )
  if (icon === "linkedin") return (
    <svg className={cls} viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
    </svg>
  )
  return (
    <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
    </svg>
  )
}

interface Props {
  config: NavConfigData
  items: PublicNavItem[]
  orgName: string
  logoUrl?: string | null
}

export default function PublicNav({ config, items, orgName, logoUrl }: Props) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [isDarkBg, setIsDarkBg] = useState(false)
  const navRef = useRef<HTMLElement>(null)

  // Close mobile menu on route change
  useEffect(() => { setMobileOpen(false) }, [pathname])

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (mobileOpen) document.body.style.overflow = "hidden"
    else document.body.style.overflow = ""
    return () => { document.body.style.overflow = "" }
  }, [mobileOpen])

  useEffect(() => {
    if (config.colorMode !== "adaptive") return
    function checkBackground() {
      if (!navRef.current) return
      const navH = navRef.current.offsetHeight
      const el = document.elementFromPoint(window.innerWidth / 2, navH + 1) as HTMLElement | null
      if (!el) return
      let target: HTMLElement | null = el
      while (target) {
        const bg = window.getComputedStyle(target).backgroundColor
        if (bg && bg !== "rgba(0, 0, 0, 0)" && bg !== "transparent") {
          const m = bg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
          if (m) {
            const r = parseInt(m[1]) / 255, g = parseInt(m[2]) / 255, b = parseInt(m[3]) / 255
            const toL = (c: number) => c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
            setIsDarkBg(0.2126 * toL(r) + 0.7152 * toL(g) + 0.0722 * toL(b) < 0.35)
          }
          return
        }
        target = target.parentElement
      }
    }
    checkBackground()
    window.addEventListener("scroll", checkBackground, { passive: true })
    return () => window.removeEventListener("scroll", checkBackground)
  }, [config.colorMode])

  const normalBg = config.colorMode === "static" ? config.staticBg : isDarkBg ? config.adaptiveDarkBg : config.adaptiveLightBg
  const bg = config.overlay ? (config.overlayBg ?? "transparent") : normalBg
  const textColor = config.colorMode === "static" ? config.staticText : isDarkBg ? config.adaptiveDarkText : config.adaptiveLightText
  const borderStyle = config.border.show ? `${config.border.width}px ${config.border.style} ${config.border.color}` : undefined
  const shadow = navBoxShadow(config.shadow)
  const showArrow = config.showDropdownArrow ?? false

  function isActive(item: PublicNavItem): boolean {
    if (item.type === "folder") return item.children.some(c => isActive(c))
    return pathname === item.href || (item.slug === "home" && pathname === "/")
  }

  return (
    <>
      <header
        ref={navRef}
        className={cn(
          "z-40 w-full transition-colors duration-300",
          config.overlay
            ? (config.fixed ? "fixed top-0 left-0 right-0" : "absolute top-0 left-0 right-0")
            : (config.fixed ? "sticky top-0" : "relative")
        )}
        style={{ backgroundColor: bg, height: config.height, borderBottom: borderStyle, boxShadow: shadow }}
      >
        <div className="h-full max-w-6xl mx-auto px-4 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="font-bold text-lg tracking-tight shrink-0" style={{ color: textColor }}>
            {logoUrl
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={logoUrl} alt={orgName} className="h-8 w-auto object-contain" />
              : orgName
            }
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center" style={{ gap: config.linkSpacing }}>
            {items.map(item => (
              <div key={item.id} className="relative group">
                {item.type === "folder" ? (
                  <button type="button"
                    className={cn("flex items-center gap-1 text-sm transition-colors", isActive(item) ? "font-medium opacity-100" : "opacity-70 hover:opacity-100")}
                    style={{ color: textColor }}
                  >
                    {item.label}
                    {showArrow && <ChevronDown className="h-3 w-3 opacity-60" />}
                  </button>
                ) : item.type === "link" ? (
                  <a
                    href={item.href ?? "#"}
                    target={item.href?.startsWith("http") ? "_blank" : undefined}
                    rel={item.href?.startsWith("http") ? "noopener noreferrer" : undefined}
                    className="flex items-center gap-1 text-sm transition-colors opacity-70 hover:opacity-100"
                    style={{ color: textColor }}
                  >
                    {item.label}
                  </a>
                ) : (
                  <Link
                    href={item.href ?? "/"}
                    className={cn("flex items-center gap-1 text-sm transition-colors", isActive(item) ? "font-medium opacity-100" : "opacity-70 hover:opacity-100")}
                    style={{ color: textColor }}
                  >
                    {item.label}
                    {showArrow && item.children.length > 0 && <ChevronDown className="h-3 w-3 opacity-60" />}
                  </Link>
                )}

                {/* Dropdown — transparent bridge (pt-2) prevents gap from closing menu */}
                {item.children.length > 0 && (
                  <div className="absolute top-full left-0 pt-2 hidden group-hover:block z-50">
                    <div
                      className="shadow-lg py-1 min-w-[160px]"
                      style={{
                        backgroundColor: config.dropdownBg === "transparent" ? "transparent" : (config.dropdownBg ?? "#ffffff"),
                        borderRadius: config.dropdownRadius ?? 8,
                        border: (config.dropdownBorder?.show ?? true)
                          ? `${config.dropdownBorder?.width ?? 1}px ${config.dropdownBorder?.style ?? "solid"} ${config.dropdownBorder?.color ?? "#e5e7eb"}`
                          : "none",
                      }}
                    >
                      {item.children.map(child => (
                        <Link key={child.id} href={child.href ?? "/"}
                          className="block px-4 py-2 text-sm hover:bg-black/5 transition-colors whitespace-nowrap"
                          style={{ color: textColor }}>
                          {child.label}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Social icons */}
            {config.showSocialIcons && config.socialLinks?.map((link, i) => (
              <a key={i} href={link.url} target="_blank" rel="noopener noreferrer"
                className="opacity-70 hover:opacity-100 transition-opacity" style={{ color: textColor }}>
                <SocialIcon icon={link.icon} />
              </a>
            ))}
          </nav>

          {/* Mobile hamburger */}
          <button className="md:hidden p-1 z-50 relative" style={{ color: textColor }}
            onClick={() => setMobileOpen(v => !v)} aria-label="Toggle menu">
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Mobile slide-over */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          {/* Slide-over panel */}
          <div
            className="absolute top-0 right-0 bottom-0 w-72 flex flex-col shadow-2xl"
            style={{ backgroundColor: normalBg || "#ffffff" }}
          >
            {/* Panel header */}
            <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: config.border.show ? config.border.color : "#e5e7eb" }}>
              <span className="font-semibold text-sm" style={{ color: textColor }}>{orgName}</span>
              <button onClick={() => setMobileOpen(false)} aria-label="Close menu" style={{ color: textColor }}>
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Nav links */}
            <nav className="flex-1 overflow-y-auto px-4 py-4 space-y-0.5">
              {items.map(item => (
                <div key={item.id}>
                  {item.type === "folder" ? (
                    <div className="px-2 pt-3 pb-1">
                      <span className="text-[10px] font-semibold uppercase tracking-wider opacity-50" style={{ color: textColor }}>
                        {item.label}
                      </span>
                    </div>
                  ) : (
                    <Link href={item.href ?? "/"} onClick={() => setMobileOpen(false)}
                      className="flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors hover:bg-black/5"
                      style={{ color: textColor, opacity: isActive(item) ? 1 : 0.8 }}>
                      {item.label}
                    </Link>
                  )}
                  {item.children.map(child => (
                    <Link key={child.id} href={child.href ?? "/"} onClick={() => setMobileOpen(false)}
                      className="flex items-center pl-6 pr-3 py-2 rounded-lg text-sm transition-colors hover:bg-black/5"
                      style={{ color: textColor, opacity: 0.65 }}>
                      {child.label}
                    </Link>
                  ))}
                </div>
              ))}

              {/* Social links */}
              {config.showSocialIcons && config.socialLinks?.length > 0 && (
                <div className="pt-4 border-t mt-4 flex flex-wrap gap-3 px-2" style={{ borderColor: "#e5e7eb" }}>
                  {config.socialLinks.map((link, i) => (
                    <a key={i} href={link.url} target="_blank" rel="noopener noreferrer"
                      className="opacity-70 hover:opacity-100 transition-opacity" style={{ color: textColor }}>
                      <SocialIcon icon={link.icon} />
                    </a>
                  ))}
                </div>
              )}
            </nav>
          </div>
        </div>
      )}
    </>
  )
}
