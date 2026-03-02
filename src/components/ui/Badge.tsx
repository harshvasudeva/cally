"use client"

import type { HTMLAttributes } from "react"

type BadgeVariant = "default" | "primary" | "success" | "warning" | "danger" | "info" | "outline"
type BadgeSize = "sm" | "md"

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
  size?: BadgeSize
  dot?: boolean
}

const variantClasses: Record<BadgeVariant, string> = {
  default: "bg-surface-secondary text-text-secondary",
  primary: "bg-primary-light text-primary",
  success: "bg-success-light text-success",
  warning: "bg-warning-light text-warning",
  danger: "bg-danger-light text-danger",
  info: "bg-info-light text-info",
  outline: "bg-transparent border border-border text-text-secondary",
}

const sizeClasses: Record<BadgeSize, string> = {
  sm: "text-[11px] px-1.5 py-0.5",
  md: "text-xs px-2 py-0.5",
}

export default function Badge({
  variant = "default",
  size = "md",
  dot = false,
  className = "",
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center gap-1 font-medium rounded-[var(--radius-full)]
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${className}
      `}
      {...props}
    >
      {dot && (
        <span className={`w-1.5 h-1.5 rounded-full bg-current`} />
      )}
      {children}
    </span>
  )
}
