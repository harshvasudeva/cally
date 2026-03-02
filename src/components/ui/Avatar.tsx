"use client"

import type { ImgHTMLAttributes } from "react"

type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl"

interface AvatarProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, "size" | "src"> {
  size?: AvatarSize
  name?: string
  src?: string | null
  status?: "online" | "offline" | "busy" | "away"
}

const sizeClasses: Record<AvatarSize, { container: string; text: string; status: string }> = {
  xs: { container: "w-6 h-6", text: "text-[10px]", status: "w-2 h-2 border" },
  sm: { container: "w-8 h-8", text: "text-xs", status: "w-2.5 h-2.5 border" },
  md: { container: "w-10 h-10", text: "text-sm", status: "w-3 h-3 border-2" },
  lg: { container: "w-12 h-12", text: "text-base", status: "w-3.5 h-3.5 border-2" },
  xl: { container: "w-16 h-16", text: "text-lg", status: "w-4 h-4 border-2" },
}

const statusColors: Record<string, string> = {
  online: "bg-success",
  offline: "bg-text-tertiary",
  busy: "bg-danger",
  away: "bg-warning",
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()
}

const gradients = [
  "from-indigo-500 to-purple-500",
  "from-cyan-500 to-blue-500",
  "from-emerald-500 to-teal-500",
  "from-orange-500 to-red-500",
  "from-pink-500 to-rose-500",
]

function getGradient(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return gradients[Math.abs(hash) % gradients.length]
}

export default function Avatar({ size = "md", name, src, status, className = "", ...props }: AvatarProps) {
  const s = sizeClasses[size]

  return (
    <div className={`relative inline-flex shrink-0 ${className}`}>
      {src ? (
        <img
          src={src}
          alt={name || "Avatar"}
          className={`${s.container} rounded-full object-cover`}
          {...props}
        />
      ) : (
        <div
          className={`
            ${s.container} rounded-full flex items-center justify-center
            bg-gradient-to-br ${name ? getGradient(name) : gradients[0]}
          `}
        >
          <span className={`${s.text} font-semibold text-white leading-none`}>
            {name ? getInitials(name) : "?"}
          </span>
        </div>
      )}
      {status && (
        <span
          className={`
            absolute bottom-0 right-0 rounded-full border-surface
            ${s.status} ${statusColors[status]}
          `}
        />
      )}
    </div>
  )
}
