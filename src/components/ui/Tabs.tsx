"use client"

import { useState, type ReactNode } from "react"

interface Tab {
  id: string
  label: string
  icon?: ReactNode
  count?: number
}

interface TabsProps {
  tabs: Tab[]
  activeTab?: string
  onChange?: (id: string) => void
  children?: ReactNode
  className?: string
}

export default function Tabs({ tabs, activeTab, onChange, className = "" }: TabsProps) {
  const [internalActive, setInternalActive] = useState(tabs[0]?.id)
  const active = activeTab ?? internalActive

  const handleChange = (id: string) => {
    setInternalActive(id)
    onChange?.(id)
  }

  return (
    <div className={`flex gap-1 border-b border-border ${className}`} role="tablist">
      {tabs.map((tab) => {
        const isActive = active === tab.id
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => handleChange(tab.id)}
            className={`
              relative flex items-center gap-2 px-3 py-2 text-sm font-medium
              transition-colors duration-[var(--transition-fast)]
              -mb-px border-b-2 cursor-pointer
              ${isActive
                ? "text-text border-primary"
                : "text-text-tertiary border-transparent hover:text-text-secondary hover:border-border"
              }
            `}
          >
            {tab.icon && <span className="shrink-0">{tab.icon}</span>}
            {tab.label}
            {tab.count !== undefined && (
              <span className={`
                text-[11px] font-medium px-1.5 py-0.5 rounded-[var(--radius-full)]
                ${isActive ? "bg-primary-light text-primary" : "bg-surface-secondary text-text-tertiary"}
              `}>
                {tab.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

interface TabPanelProps {
  id: string
  activeTab: string
  children: ReactNode
  className?: string
}

export function TabPanel({ id, activeTab, children, className = "" }: TabPanelProps) {
  if (id !== activeTab) return null
  return (
    <div role="tabpanel" className={`animate-fade-in ${className}`}>
      {children}
    </div>
  )
}
