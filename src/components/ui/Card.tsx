"use client"

import type { HTMLAttributes, ReactNode } from "react"

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hover?: boolean
  padding?: "none" | "sm" | "md" | "lg"
}

interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  title?: string
  description?: string
  action?: ReactNode
}

const paddingClasses = {
  none: "",
  sm: "p-4",
  md: "p-6",
  lg: "p-8",
}

export function Card({ hover = false, padding = "md", className = "", children, ...props }: CardProps) {
  return (
    <div
      className={`
        bg-surface border border-border rounded-[var(--radius-lg)]
        ${paddingClasses[padding]}
        ${hover ? "transition-all duration-[var(--transition-base)] hover:shadow-md hover:border-border-hover cursor-pointer" : ""}
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  )
}

export function CardHeader({ title, description, action, className = "", children, ...props }: CardHeaderProps) {
  return (
    <div className={`flex items-start justify-between gap-4 ${className}`} {...props}>
      <div className="min-w-0">
        {title && <h3 className="text-sm font-semibold text-text">{title}</h3>}
        {description && <p className="mt-0.5 text-xs text-text-secondary">{description}</p>}
        {children}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}

export function CardBody({ className = "", children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`${className}`} {...props}>
      {children}
    </div>
  )
}

export function CardFooter({ className = "", children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`flex items-center gap-3 pt-4 border-t border-border ${className}`} {...props}>
      {children}
    </div>
  )
}
