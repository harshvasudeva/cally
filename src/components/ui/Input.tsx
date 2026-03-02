"use client"

import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react"

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helpText?: string
  prefixIcon?: ReactNode
  suffixIcon?: ReactNode
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helpText, prefixIcon, suffixIcon, className = "", id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined)

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="block text-[13px] font-medium text-text-secondary mb-1.5">
            {label}
          </label>
        )}
        <div className="relative">
          {prefixIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary">
              {prefixIcon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={`
              w-full h-9 px-3 text-sm rounded-[var(--radius-md)]
              bg-surface border border-border text-text
              placeholder:text-text-tertiary
              transition-all duration-[var(--transition-fast)]
              focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent
              disabled:opacity-50 disabled:cursor-not-allowed
              ${prefixIcon ? "pl-9" : ""}
              ${suffixIcon ? "pr-9" : ""}
              ${error ? "border-danger focus:ring-danger" : ""}
              ${className}
            `}
            aria-invalid={error ? "true" : undefined}
            aria-describedby={error ? `${inputId}-error` : helpText ? `${inputId}-help` : undefined}
            {...props}
          />
          {suffixIcon && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary">
              {suffixIcon}
            </div>
          )}
        </div>
        {error && (
          <p id={`${inputId}-error`} className="mt-1 text-xs text-danger" role="alert">
            {error}
          </p>
        )}
        {helpText && !error && (
          <p id={`${inputId}-help`} className="mt-1 text-xs text-text-tertiary">
            {helpText}
          </p>
        )}
      </div>
    )
  }
)

Input.displayName = "Input"
export default Input
