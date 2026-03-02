"use client"

interface SkeletonProps {
  className?: string
  variant?: "text" | "circular" | "rectangular"
  width?: string | number
  height?: string | number
  lines?: number
}

export default function Skeleton({
  className = "",
  variant = "rectangular",
  width,
  height,
  lines,
}: SkeletonProps) {
  const style = {
    width: typeof width === "number" ? `${width}px` : width,
    height: typeof height === "number" ? `${height}px` : height,
  }

  if (lines && lines > 1) {
    return (
      <div className={`space-y-2 ${className}`}>
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={`
              bg-surface-secondary rounded-[var(--radius-sm)]
              animate-pulse
              ${i === lines - 1 ? "w-3/4" : "w-full"}
            `}
            style={{ height: height || "16px" }}
          />
        ))}
      </div>
    )
  }

  const variantClasses = {
    text: "rounded-[var(--radius-sm)] h-4 w-full",
    circular: "rounded-full",
    rectangular: "rounded-[var(--radius-md)]",
  }

  return (
    <div
      className={`
        bg-surface-secondary animate-pulse
        ${variantClasses[variant]}
        ${className}
      `}
      style={style}
    />
  )
}

export function SkeletonCard({ className = "" }: { className?: string }) {
  return (
    <div className={`bg-surface border border-border rounded-[var(--radius-lg)] p-6 ${className}`}>
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
