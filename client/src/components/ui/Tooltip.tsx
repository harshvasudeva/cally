"use client"

import * as React from "react"
import * as TooltipPrimitive from "@radix-ui/react-tooltip"

import { cn } from "@/lib/utils"

const TooltipProvider = TooltipPrimitive.Provider

const TooltipRoot = TooltipPrimitive.Root

const TooltipTrigger = TooltipPrimitive.Trigger

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <TooltipPrimitive.Portal>
    <TooltipPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        "z-50 overflow-hidden rounded-md border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
        className
      )}
      {...props}
    />
  </TooltipPrimitive.Portal>
))
TooltipContent.displayName = TooltipPrimitive.Content.displayName

// --- Legacy Backend Compatibility Layer ---

interface TooltipProps {
  content: string | React.ReactNode
  children: React.ReactNode
  side?: "top" | "bottom" | "left" | "right"
  delay?: number
}

export default function Tooltip({ content, children, side = "top", delay = 200 }: TooltipProps) {
  return (
    <TooltipProvider delayDuration={delay}>
      <TooltipRoot>
        <TooltipTrigger asChild>
          <div className="inline-flex cursor-default">{children}</div>
        </TooltipTrigger>
        <TooltipContent side={side} className="bg-foreground text-background text-xs font-medium px-2.5 py-1.5">
          {content}
        </TooltipContent>
      </TooltipRoot>
    </TooltipProvider>
  )
}

export { TooltipRoot as Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }
