"use client"

import { forwardRef, type SelectHTMLAttributes, type ReactNode } from "react"
import { ChevronDown } from "lucide-react"

interface SelectOption {
  value: string
  label: string
  disabled?: boolean
}

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "children"> {
  label?: string
  error?: string
  helpText?: string
  options: SelectOption[]
  placeholder?: string
  prefixIcon?: ReactNode
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, helpText, options, placeholder, prefixIcon, className = "", id, ...props }, ref) => {
    const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined)

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={selectId} className="block text-[13px] font-medium text-text-secondary mb-1.5">
            {label}
          </label>
        )}
        <div className="relative">
          {prefixIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary pointer-events-none">
              {prefixIcon}
            </div>
          )}
          <select
            ref={ref}
            id={selectId}
            className={`
              w-full h-9 px-3 pr-9 text-sm rounded-[var(--radius-md)]
              bg-surface border border-border text-text
              transition-all duration-[var(--transition-fast)]
              focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent
              disabled:opacity-50 disabled:cursor-not-allowed
              appearance-none cursor-pointer
              ${prefixIcon ? "pl-9" : ""}
              ${error ? "border-danger focus:ring-danger" : ""}
              ${className}
            `}
            aria-invalid={error ? "true" : undefined}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((opt) => (
              <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                {opt.label}
              </option>
            ))}
          </select>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-text-tertiary">
            <ChevronDown size={14} />
          </div>
        </div>
        {error && (
          <p className="mt-1 text-xs text-danger" role="alert">
            {error}
          </p>
        )}
        {helpText && !error && (
          <p className="mt-1 text-xs text-text-tertiary">
            {helpText}
          </p>
        )}
      </div>
    )
  }
)

Select.displayName = "Select"
export default Select
