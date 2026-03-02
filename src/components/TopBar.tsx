"use client"

import { useMemo } from "react"
import Link from "next/link"
import { useSession, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Calendar, Search, Bell, LogOut, Settings, User, Command } from "lucide-react"
import Avatar from "./ui/Avatar"
import Dropdown from "./ui/Dropdown"
import ThemeToggle from "./ThemeToggle"
import { useBranding } from "./BrandingProvider"

interface TopBarProps {
  onOpenSearch?: () => void
}

export default function TopBar({ onOpenSearch }: TopBarProps) {
  const { data: session } = useSession()
  const router = useRouter()
  const branding = useBranding()
  const userName = session?.user?.name || ""
  const userEmail = session?.user?.email || ""
  const userImage = session?.user?.image

  return (
    <header
      className="
        fixed top-0 left-0 right-0 z-40
        h-[var(--top-bar-height)] bg-surface border-b border-border
        flex items-center justify-between px-4 gap-4
      "
    >
      {/* Left: Logo */}
      <Link href="/dashboard" className="flex items-center gap-2.5 shrink-0">
        {branding.logoUrl ? (
          <img src={branding.logoUrl} alt={branding.siteName} className="w-8 h-8 rounded-[var(--radius-lg)] object-cover" />
        ) : (
          <div className="w-8 h-8 rounded-[var(--radius-lg)] gradient-primary flex items-center justify-center">
            <Calendar size={18} className="text-white" />
          </div>
        )}
        <span className="text-base font-bold text-text hidden sm:block">{branding.siteName}</span>
      </Link>

      {/* Center: Search */}
      <button
        onClick={onOpenSearch}
        className="
          flex items-center gap-2 h-9 px-3 max-w-md w-full
          bg-surface-secondary rounded-[var(--radius-md)]
          text-text-tertiary text-sm
          hover:bg-surface-hover transition-colors cursor-pointer
          border border-transparent hover:border-border
        "
      >
        <Search size={15} />
        <span className="flex-1 text-left">Search...</span>
        <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[11px] font-mono rounded bg-surface border border-border text-text-tertiary">
          <Command size={10} />K
        </kbd>
      </button>

      {/* Right: Actions */}
      <div className="flex items-center gap-1 shrink-0">
        <ThemeToggle />

        {/* Notifications */}
        <button
          className="
            p-2 rounded-[var(--radius-md)]
            text-text-tertiary hover:text-text hover:bg-surface-hover
            transition-colors relative
          "
          aria-label="Notifications"
        >
          <Bell size={18} />
          {/* Unread indicator */}
          {/* <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-danger rounded-full" /> */}
        </button>

        {/* User menu */}
        <Dropdown
          align="right"
          trigger={
            <div className="p-1 rounded-[var(--radius-md)] hover:bg-surface-hover transition-colors cursor-pointer">
              <Avatar size="sm" name={userName} src={userImage} />
            </div>
          }
          items={useMemo(() => [
            {
              id: "profile",
              label: userName || "Profile",
              icon: <User size={14} />,
              onClick: () => router.push("/settings/profile"),
            },
            {
              id: "settings",
              label: "Settings",
              icon: <Settings size={14} />,
              onClick: () => router.push("/settings/profile"),
            },
            "divider",
            {
              id: "signout",
              label: "Sign out",
              icon: <LogOut size={14} />,
              variant: "danger",
              onClick: () => signOut({ callbackUrl: "/login" }),
            },
          ], [userName, router])}
        />
      </div>
    </header>
  )
}
