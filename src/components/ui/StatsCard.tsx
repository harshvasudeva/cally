"use client"

import type { ReactNode } from "react"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"

interface StatsCardProps {
  label: string
  value: string | number
  icon?: ReactNode
  trend?: {
    value: number
    label?: string
  }
  className?: string
}

export default function StatsCard({ label, value, icon, trend, className = "" }: StatsCardProps) {
  const trendDirection = trend ? (trend.value > 0 ? "up" : trend.value < 0 ? "down" : "flat") : null

  return (
    <div className={`bg-surface border border-border rounded-[var(--radius-lg)] p-5 ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-text-tertiary uppercase tracking-wider">{label}</p>
          <p className="mt-1.5 text-2xl font-semibold text-text tabular-nums">{value}</p>
        </div>
        {icon && (
          <div className="shrink-0 w-10 h-10 rounded-[var(--radius-lg)] bg-surface-secondary flex items-center justify-center text-text-secondary">
            {icon}
          </div>
        )}
      </div>
      {trend && (
        <div className="mt-3 flex items-center gap-1.5">
          {trendDirection === "up" && <TrendingUp size={14} className="text-success" />}
          {trendDirection === "down" && <TrendingDown size={14} className="text-danger" />}
          {trendDirection === "flat" && <Minus size={14} className="text-text-tertiary" />}
          <span className={`text-xs font-medium ${
            trendDirection === "up" ? "text-success" : trendDirection === "down" ? "text-danger" : "text-text-tertiary"
          }`}>
            {trend.value > 0 ? "+" : ""}{trend.value}%
          </span>
          {trend.label && <span className="text-xs text-text-tertiary">{trend.label}</span>}
        </div>
      )}
    </div>
  )
}
