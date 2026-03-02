"use client"

import { useEffect, useRef, type ReactNode, type HTMLAttributes } from "react"
import { X } from "lucide-react"

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  description?: string
  children: ReactNode
  size?: "sm" | "md" | "lg" | "xl"
  footer?: ReactNode
}

const sizeClasses = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
}

export default function Modal({
  open,
  onClose,
  title,
  description,
  children,
  size = "md",
  footer,
}: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (open) {
      dialog.showModal()
    } else {
      dialog.close()
    }
  }, [open])

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    const handleCancel = (e: Event) => {
      e.preventDefault()
      onClose()
    }

    dialog.addEventListener("cancel", handleCancel)
    return () => dialog.removeEventListener("cancel", handleCancel)
  }, [onClose])

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === dialogRef.current) {
      onClose()
    }
  }

  if (!open) return null

  return (
    <dialog
      ref={dialogRef}
      onClick={handleBackdropClick}
      className={`
        ${sizeClasses[size]} w-full
        bg-surface border border-border rounded-[var(--radius-xl)]
        shadow-xl p-0 m-auto
        backdrop:bg-black/50 backdrop:backdrop-blur-sm
        animate-scale-in
      `}
    >
      {/* Header */}
      {(title || description) && (
        <div className="flex items-start justify-between gap-4 px-6 pt-6 pb-4">
          <div>
            {title && <h2 className="text-base font-semibold text-text">{title}</h2>}
            {description && <p className="mt-1 text-sm text-text-secondary">{description}</p>}
          </div>
          <button
            onClick={onClose}
            className="shrink-0 p-1.5 rounded-[var(--radius-md)] text-text-tertiary hover:text-text hover:bg-surface-hover transition-colors"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Body */}
      <div className="px-6 pb-6">
        {children}
      </div>

      {/* Footer */}
      {footer && (
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border">
          {footer}
        </div>
      )}
    </dialog>
  )
}

export function ModalTitle({ className = "", children, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={`text-base font-semibold text-text ${className}`} {...props}>{children}</h2>
}

export function ModalDescription({ className = "", children, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={`mt-1 text-sm text-text-secondary ${className}`} {...props}>{children}</p>
}
