"use client"

import { forwardRef, type InputHTMLAttributes } from "react"

interface SwitchProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "size"> {
  label?: string
  description?: string
  size?: "sm" | "md"
}

const Switch = forwardRef<HTMLInputElement, SwitchProps>(
  ({ label, description, size = "md", className = "", id, ...props }, ref) => {
    const switchId = id || (label ? `switch-${label.toLowerCase().replace(/\s+/g, "-")}` : undefined)

    const trackSize = size === "sm" ? "w-8 h-[18px]" : "w-10 h-[22px]"
    const thumbSize = size === "sm" ? "w-3.5 h-3.5" : "w-[18px] h-[18px]"
    const thumbTranslate = size === "sm" ? "translate-x-[14px]" : "translate-x-[18px]"

    return (
      <label htmlFor={switchId} className={`inline-flex items-start gap-3 cursor-pointer select-none ${className}`}>
        <div className="relative shrink-0 mt-0.5">
          <input
            ref={ref}
            type="checkbox"
            id={switchId}
            className="sr-only peer"
            {...props}
          />
          <div className={`
            ${trackSize} rounded-full
            bg-surface-tertiary
            peer-checked:bg-primary
            peer-focus-visible:ring-2 peer-focus-visible:ring-primary peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-surface
            peer-disabled:opacity-50 peer-disabled:cursor-not-allowed
            transition-colors duration-[var(--transition-base)]
          `} />
          <div className={`
            absolute top-[2px] left-[2px] ${thumbSize}
            bg-white rounded-full shadow-sm
            peer-checked:${thumbTranslate}
            transition-transform duration-[var(--transition-base)]
          `} />
        </div>
        {(label || description) && (
          <div className="min-w-0">
            {label && <p className="text-sm font-medium text-text">{label}</p>}
            {description && <p className="text-xs text-text-tertiary mt-0.5">{description}</p>}
          </div>
        )}
      </label>
    )
  }
)

Switch.displayName = "Switch"
export default Switch
