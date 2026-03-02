"use client"

import { useState, useRef, useEffect, type ReactNode } from "react"

interface DropdownItem {
  id: string
  label: string
  icon?: ReactNode
  onClick?: () => void
  variant?: "default" | "danger"
  disabled?: boolean
}

interface DropdownProps {
  trigger: ReactNode
  items: (DropdownItem | "divider")[]
  align?: "left" | "right"
  className?: string
}

export default function Dropdown({ trigger, items, align = "left", className = "" }: DropdownProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside)
    }
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [open])

  useEffect(() => {
    if (!open) return
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("keydown", handleEsc)
    return () => document.removeEventListener("keydown", handleEsc)
  }, [open])

  return (
    <div ref={ref} className={`relative inline-flex ${className}`}>
      <div onClick={() => setOpen(!open)} className="cursor-pointer">
        {trigger}
      </div>
      {open && (
        <div
          className={`
            absolute z-50 top-full mt-1 min-w-[180px]
            bg-surface border border-border rounded-[var(--radius-lg)]
            shadow-lg py-1 animate-scale-in
            ${align === "right" ? "right-0" : "left-0"}
          `}
          role="menu"
        >
          {items.map((item, i) => {
            if (item === "divider") {
              return <div key={`div-${i}`} className="my-1 border-t border-border" />
            }
            return (
              <button
                key={item.id}
                role="menuitem"
                disabled={item.disabled}
                onClick={() => {
                  item.onClick?.()
                  setOpen(false)
                }}
                className={`
                  w-full flex items-center gap-2.5 px-3 py-2 text-sm
                  transition-colors cursor-pointer
                  disabled:opacity-50 disabled:cursor-not-allowed
                  ${item.variant === "danger"
                    ? "text-danger hover:bg-danger-light"
                    : "text-text-secondary hover:bg-surface-hover hover:text-text"
                  }
                `}
              >
                {item.icon && <span className="shrink-0 w-4 h-4 flex items-center justify-center">{item.icon}</span>}
                {item.label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
