"use client"

import { useState, useRef, type ReactNode } from "react"

interface TooltipProps {
  content: string
  children: ReactNode
  side?: "top" | "bottom" | "left" | "right"
  delay?: number
}

const positionClasses = {
  top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
  bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
  left: "right-full top-1/2 -translate-y-1/2 mr-2",
  right: "left-full top-1/2 -translate-y-1/2 ml-2",
}

export default function Tooltip({ content, children, side = "top", delay = 200 }: TooltipProps) {
  const [visible, setVisible] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const show = () => {
    timerRef.current = setTimeout(() => setVisible(true), delay)
  }

  const hide = () => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setVisible(false)
  }

  return (
    <div className="relative inline-flex" onMouseEnter={show} onMouseLeave={hide} onFocus={show} onBlur={hide}>
      {children}
      {visible && (
        <div
          className={`
            absolute z-50 ${positionClasses[side]}
            px-2.5 py-1.5 text-xs font-medium
            bg-text text-text-inverse rounded-[var(--radius-md)]
            shadow-lg whitespace-nowrap pointer-events-none
            animate-fade-in
          `}
          role="tooltip"
        >
          {content}
        </div>
      )}
    </div>
  )
}
