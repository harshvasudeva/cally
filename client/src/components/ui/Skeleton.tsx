import * as React from "react"
import { cn } from "@/lib/utils"

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "text" | "circular" | "rectangular"
  width?: string | number
  height?: string | number
  lines?: number
}

function Skeleton({
  className,
  variant = "rectangular",
  width,
  height,
  lines,
  ...props
}: SkeletonProps) {
  const style = {
    width: typeof width === "number" ? `${width}px` : width,
    height: typeof height === "number" ? `${height}px` : height,
    ...props.style,
  }

  if (lines && lines > 1) {
    return (
      <div className={cn("space-y-2", className)} {...props}>
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "animate-pulse rounded-md bg-muted",
              i === lines - 1 ? "w-3/4" : "w-full"
            )}
            style={{ height: height || "16px" }}
          />
        ))}
      </div>
    )
  }

  const variantClasses = {
    text: "rounded-md h-4 w-full",
    circular: "rounded-full",
    rectangular: "rounded-md",
  }

  return (
    <div
      className={cn("animate-pulse bg-muted", variantClasses[variant], className)}
      style={style}
      {...props}
    />
  )
}

export function SkeletonCard({ className = "" }: { className?: string }) {
  return (
    <div className={cn("rounded-xl border bg-card text-card-foreground shadow p-6", className)}>
      <div className="flex items-center gap-3 mb-4">
        <Skeleton variant="circular" width={40} height={40} />
        <div className="flex-1">
          <Skeleton height={14} width="60%" className="mb-2" />
          <Skeleton height={12} width="40%" />
        </div>
      </div>
      <Skeleton lines={3} />
    </div>
  )
}

export { Skeleton }
export default Skeleton
