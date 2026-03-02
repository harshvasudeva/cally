"use client"

import { useSession } from "next-auth/react"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useState, useCallback, type ReactNode } from "react"
import TopBar from "./TopBar"
import NavigationRail from "./NavigationRail"
import { useBranding } from "./BrandingProvider"

// Pages that don't use the app shell (no nav rail / top bar)
const PUBLIC_PATHS = ["/login", "/register", "/book", "/maintenance"]

interface AppShellProps {
  children: ReactNode
}

export default function AppShell({ children }: AppShellProps) {
  const pathname = usePathname()
  const { data: session, status } = useSession()
  const router = useRouter()
  const branding = useBranding()
  const [searchOpen, setSearchOpen] = useState(false)
  const isAdmin = (session?.user as { role?: string })?.role === "ADMIN"

  const isPublicPage = PUBLIC_PATHS.some((p) => pathname.startsWith(p))

  // Open command palette when search is triggered
  const handleOpenSearch = useCallback(() => {
    // Dispatch Ctrl+K to open the existing CommandPalette
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true }))
  }, [])

  // Public pages render without shell
  if (isPublicPage) {
    return <>{children}</>
  }

  // Maintenance mode — redirect non-admins to maintenance page
  // (admins can still access the dashboard to toggle it off)
  if (branding.maintenanceMode && !isAdmin && pathname !== "/maintenance") {
    router.replace("/maintenance")
    return null
  }

  // Show loading while checking auth
  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="loading-spinner loading-spinner-lg" />
      </div>
    )
  }

  // Unauthenticated users on protected pages get redirected by proxy
  if (status === "unauthenticated") {
    return null
  }

  return (
    <div className="min-h-screen bg-background">
      <TopBar onOpenSearch={handleOpenSearch} />
      <NavigationRail />

      {/* Main content — offset by top bar height and nav rail width */}
      <main
        className="
          pt-[var(--top-bar-height)] pl-[var(--nav-rail-width)]
          min-h-screen
          transition-[padding] duration-[var(--transition-slow)]
        "
      >
        <div className="p-6 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  )
}
