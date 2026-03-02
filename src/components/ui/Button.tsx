"use client"

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react"

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "outline" | "success"
type ButtonSize = "sm" | "md" | "lg"

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  icon?: ReactNode
  iconRight?: ReactNode
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-primary text-white hover:bg-primary-hover shadow-xs active:shadow-none",
  secondary:
    "bg-surface-secondary text-text hover:bg-surface-tertiary",
  ghost:
    "bg-transparent text-text-secondary hover:bg-surface-hover hover:text-text",
  danger:
    "bg-danger text-white hover:bg-red-600 shadow-xs",
  outline:
    "bg-transparent border border-border text-text-secondary hover:bg-surface-hover hover:text-text hover:border-border-hover",
  success:
    "bg-success text-white hover:bg-emerald-600 shadow-xs",
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-xs gap-1.5 rounded-[var(--radius-md)]",
  md: "h-9 px-4 text-sm gap-2 rounded-[var(--radius-md)]",
  lg: "h-11 px-6 text-sm gap-2 rounded-[var(--radius-lg)]",
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      loading = false,
      icon,
      iconRight,
      disabled,
      className = "",
      children,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`
          inline-flex items-center justify-center font-medium
          transition-all duration-[var(--transition-base)]
          disabled:opacity-50 disabled:cursor-not-allowed
          cursor-pointer select-none
          ${variantClasses[variant]}
          ${sizeClasses[size]}
          ${className}
        `}
        {...props}
      >
        {loading ? (
          <span className="loading-spinner loading-spinner-sm" />
        ) : icon ? (
          <span className="shrink-0">{icon}</span>
        ) : null}
        {children && <span>{children}</span>}
        {iconRight && !loading && (
          <span className="shrink-0">{iconRight}</span>
        )}
      </button>
    )
  }
)

Button.displayName = "Button"
export default Button
