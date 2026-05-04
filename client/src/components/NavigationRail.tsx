"use client"

import { useState, memo } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSession } from "@/lib/auth-react-compat"
import {
  Calendar,
  CalendarCheck,
  Clock,
  LayoutDashboard,
  CalendarOff,
  CalendarX2,
  Upload,
  Users,
  Settings,
  Shield,
  Puzzle,
  Radio,
  Globe,
  Key,
  Bell,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import Tooltip from "./ui/Tooltip"

interface NavItem {
  href: string
  label: string
  icon: typeof Calendar
}

const mainItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/appointments", label: "Appointments", icon: CalendarCheck },
  { href: "/availability", label: "Availability", icon: Clock },
  { href: "/appointment-types", label: "Event Types", icon: CalendarOff },
  { href: "/date-overrides", label: "Date Overrides", icon: CalendarX2 },
  { href: "/import", label: "Import", icon: Upload },
]

const integrationItems: NavItem[] = [
  { href: "/plugins", label: "Plugins", icon: Puzzle },
  { href: "/streams", label: "Streams", icon: Radio },
]

const adminItems: NavItem[] = [
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/settings", label: "Settings", icon: Settings },
  { href: "/admin/audit", label: "Audit Log", icon: Shield },
]

const bottomItems: NavItem[] = [
  { href: "/settings/domains", label: "Domains", icon: Globe },
  { href: "/settings/api-keys", label: "API Keys", icon: Key },
  { href: "/settings/notifications", label: "Notifications", icon: Bell },
  { href: "/settings/profile", label: "Settings", icon: Settings },
]

const NavLink = memo(function NavLink({ item, expanded, isActive }: { item: NavItem; expanded: boolean; isActive: boolean }) {
  const Icon = item.icon

  const link = (
    <Link
      href={item.href}
      aria-current={isActive ? "page" : undefined}
      className={`
        flex items-center gap-3 px-3 py-2 h-9 rounded-[var(--radius-md)] transition-all duration-[var(--transition-fast)]
        ${isActive
          ? "bg-primary-light text-primary"
          : "text-text-tertiary hover:text-text hover:bg-surface-hover"
        }
      `}
    >
      <Icon size={18} className="shrink-0" />
      <span 
        className={`text-sm font-medium whitespace-nowrap overflow-hidden transition-all duration-[var(--transition-slow)] ${
          expanded ? "max-w-[160px] opacity-100" : "max-w-0 opacity-0"
        }`}
      >
        {item.label}
      </span>
    </Link>
  )

  if (!expanded) {
    return <Tooltip content={item.label} side="right">{link}</Tooltip>
  }
  return link
})

const NavSection = memo(function NavSection({ label, items, expanded, pathname }: { label?: string; items: NavItem[]; expanded: boolean; pathname: string }) {
  return (
    <div className="space-y-0.5">
      {label && (
        <p 
          className={`px-3 pt-4 pb-1 text-[11px] font-semibold text-text-tertiary uppercase tracking-wider transition-opacity duration-[var(--transition-slow)] ${
            expanded ? "opacity-100" : "opacity-0 select-none"
          }`}
          aria-hidden={!expanded}
        >
          {label}
        </p>
      )}
      {items.map((item) => (
        <NavLink
          key={item.href}
          item={item}
          expanded={expanded}
          isActive={pathname === item.href || pathname.startsWith(item.href + "/")}
        />
      ))}
    </div>
  )
})

export default function NavigationRail() {
  const [expanded, setExpanded] = useState(false)
  const pathname = usePathname()
  const { data: session } = useSession()
  const isAdmin = (session?.user as { role?: string })?.role === "ADMIN"

  return (
    <aside
      className={`
        fixed left-0 top-[var(--top-bar-height)] bottom-0 z-30
        bg-surface border-r border-border
        flex flex-col
        transition-all duration-[var(--transition-slow)]
        ${expanded ? "w-[var(--nav-rail-expanded)]" : "w-[var(--nav-rail-width)]"}
      `}
      role="navigation"
      aria-label="Main navigation"
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
    >
      {/* Main nav */}
      <nav className="flex-1 p-2 overflow-y-auto overflow-x-hidden space-y-1">
        <NavSection items={mainItems} expanded={expanded} pathname={pathname} />

        {/* Divider */}
        <div className="my-2 mx-2 border-t border-border" />

        <NavSection label="Integrations" items={integrationItems} expanded={expanded} pathname={pathname} />

        {isAdmin && (
          <>
            <div className="my-2 mx-2 border-t border-border" />
            <NavSection label="Admin" items={adminItems} expanded={expanded} pathname={pathname} />
          </>
        )}
      </nav>

      {/* Bottom section */}
      <div className="p-2 border-t border-border space-y-0.5">
        <NavSection items={bottomItems} expanded={expanded} pathname={pathname} />

        {/* Toggle button */}
        <button
          onClick={() => setExpanded(!expanded)}
          className={`
            flex items-center gap-3 px-3 py-2 h-9 w-full rounded-[var(--radius-md)]
            text-text-tertiary hover:text-text hover:bg-surface-hover
            transition-all duration-[var(--transition-fast)]
          `}
          aria-label={expanded ? "Collapse navigation" : "Expand navigation"}
        >
          <div className="shrink-0 flex items-center justify-center w-[18px]">
            {expanded ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
          </div>
          <span 
            className={`text-sm font-medium whitespace-nowrap overflow-hidden transition-all duration-[var(--transition-slow)] ${
              expanded ? "max-w-[160px] opacity-100" : "max-w-0 opacity-0"
            }`}
          >
            Collapse
          </span>
        </button>
      </div>
    </aside>
  )
}
