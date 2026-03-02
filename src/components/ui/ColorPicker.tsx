"use client"

import { useState } from "react"
import { Check } from "lucide-react"

const PRESET_COLORS = [
  "#ef4444", "#f97316", "#f59e0b", "#84cc16", "#10b981",
  "#06b6d4", "#3b82f6", "#6366f1", "#8b5cf6", "#ec4899",
  "#f43f5e", "#78716c",
]

interface ColorPickerProps {
  value?: string
  onChange?: (color: string) => void
  label?: string
  colors?: string[]
  className?: string
}

export default function ColorPicker({
  value,
  onChange,
  label,
  colors = PRESET_COLORS,
  className = "",
}: ColorPickerProps) {
  const [selected, setSelected] = useState(value || colors[0])

  const handleSelect = (color: string) => {
    setSelected(color)
    onChange?.(color)
  }

  return (
    <div className={className}>
      {label && (
        <p className="text-[13px] font-medium text-text-secondary mb-2">{label}</p>
      )}
      <div className="flex flex-wrap gap-2">
        {colors.map((color) => (
          <button
            key={color}
            type="button"
            onClick={() => handleSelect(color)}
            className={`
              w-7 h-7 rounded-full cursor-pointer
              flex items-center justify-center
              transition-all duration-[var(--transition-fast)]
              ring-offset-2 ring-offset-surface
              ${selected === color ? "ring-2 ring-primary scale-110" : "hover:scale-110"}
            `}
            style={{ backgroundColor: color }}
            aria-label={`Select color ${color}`}
          >
            {selected === color && <Check size={14} className="text-white drop-shadow-sm" />}
          </button>
        ))}
      </div>
      <div className="mt-2 flex items-center gap-2">
        <input
          type="text"
          value={selected}
          onChange={(e) => handleSelect(e.target.value)}
          className="w-24 h-7 px-2 text-xs font-mono rounded-[var(--radius-sm)] bg-surface border border-border text-text focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder="#000000"
        />
        <div
          className="w-7 h-7 rounded-[var(--radius-sm)] border border-border shrink-0"
          style={{ backgroundColor: selected }}
        />
      </div>
    </div>
  )
}
