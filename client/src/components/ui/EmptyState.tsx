"use client"

import type { ReactNode } from "react"
import { Inbox } from "lucide-react"

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
  className?: string
}

export default function EmptyState({
  icon,
  title,
  description,
  action,
  className = "",
}: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-16 px-4 text-center ${className}`}>
      <div className="w-12 h-12 rounded-[var(--radius-xl)] bg-surface-secondary flex items-center justify-center mb-4 text-text-tertiary">
        {icon || <Inbox size={24} />}
      </div>
      <h3 className="text-sm font-semibold text-text mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-text-tertiary max-w-sm mb-4">{description}</p>
      )}
      {action && <div>{action}</div>}
    </div>
  )
}
