"use client"

import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"

import { cn } from "@/lib/utils"

const TabsRoot = TabsPrimitive.Root

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      "inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground",
      className
    )}
    {...props}
  />
))
TabsList.displayName = TabsPrimitive.List.displayName

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm",
      className
    )}
    {...props}
  />
))
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      className
    )}
    {...props}
  />
))
TabsContent.displayName = TabsPrimitive.Content.displayName


// --- Legacy Backend Compatibility Layer ---

interface Tab {
  id: string
  label: string
  icon?: React.ReactNode
  count?: number
}

interface TabsProps {
  tabs: Tab[]
  activeTab?: string
  onChange?: (id: string) => void
  children?: React.ReactNode
  className?: string
}

export default function Tabs({ tabs, activeTab, onChange, className = "" }: TabsProps) {
  const [internalActive, setInternalActive] = React.useState(tabs[0]?.id)
  const active = activeTab ?? internalActive

  const handleChange = (id: string) => {
    setInternalActive(id)
    onChange?.(id)
  }

  return (
    <div className={cn("flex gap-1 border-b border-border", className)} role="tablist">
      {tabs.map((tab) => {
        const isActive = active === tab.id
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => handleChange(tab.id)}
            className={cn(
              "relative flex items-center gap-2 px-3 py-2 text-sm font-medium transition-colors duration-[var(--transition-fast)] -mb-px border-b-2 cursor-pointer",
              isActive
                ? "text-foreground border-primary"
                : "text-muted-foreground border-transparent hover:text-foreground hover:border-border"
            )}
          >
            {tab.icon && <span className="shrink-0">{tab.icon}</span>}
            {tab.label}
            {tab.count !== undefined && (
              <span className={cn(
                "text-[11px] font-medium px-1.5 py-0.5 rounded-[var(--radius-full)]",
                isActive ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
              )}>
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
  children: React.ReactNode
  className?: string
}

export function TabPanel({ id, activeTab, children, className = "" }: TabPanelProps) {
  if (id !== activeTab) return null
  return (
    <div role="tabpanel" className={cn("animate-in fade-in-0", className)}>
      {children}
    </div>
  )
}

export {
  TabsRoot as Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
}
