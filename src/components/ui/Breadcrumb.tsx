"use client"

import Link from "next/link"
import { ChevronRight } from "lucide-react"
import type { ReactNode } from "react"

interface BreadcrumbItem {
  label: string
  href?: string
  icon?: ReactNode
}

interface BreadcrumbProps {
  items: BreadcrumbItem[]
  className?: string
}

export default function Breadcrumb({ items, className = "" }: BreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol className="flex items-center gap-1.5 text-sm">
        {items.map((item, i) => {
          const isLast = i === items.length - 1
          return (
            <li key={i} className="flex items-center gap-1.5">
              {i > 0 && <ChevronRight size={14} className="text-text-tertiary shrink-0" />}
              {item.href && !isLast ? (
                <Link
                  href={item.href}
                  className="flex items-center gap-1.5 text-text-tertiary hover:text-text transition-colors"
                >
                  {item.icon && <span className="shrink-0">{item.icon}</span>}
                  {item.label}
                </Link>
              ) : (
                <span className={`flex items-center gap-1.5 ${isLast ? "text-text font-medium" : "text-text-tertiary"}`}>
                  {item.icon && <span className="shrink-0">{item.icon}</span>}
                  {item.label}
                </span>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
