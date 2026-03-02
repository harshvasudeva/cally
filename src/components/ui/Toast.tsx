"use client"

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
  type ReactNode,
} from "react"
import { CheckCircle, XCircle, AlertTriangle, Info, X } from "lucide-react"

type ToastType = "success" | "error" | "warning" | "info"

interface ToastItem {
  id: string
  message: string
  type: ToastType
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const TOAST_DURATION = 4000

const iconMap: Record<ToastType, typeof CheckCircle> = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
}

const colorMap: Record<ToastType, { bg: string; icon: string; border: string }> = {
  success: { bg: "bg-success-light", icon: "text-success", border: "border-l-success" },
  error: { bg: "bg-danger-light", icon: "text-danger", border: "border-l-danger" },
  warning: { bg: "bg-warning-light", icon: "text-warning", border: "border-l-warning" },
  info: { bg: "bg-info-light", icon: "text-info", border: "border-l-info" },
}

function ToastMessage({ item, onDismiss }: { item: ToastItem; onDismiss: (id: string) => void }) {
  const [isVisible, setIsVisible] = useState(false)
  const [isLeaving, setIsLeaving] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const Icon = iconMap[item.type]
  const colors = colorMap[item.type]

  useEffect(() => {
    const frame = requestAnimationFrame(() => setIsVisible(true))

    timerRef.current = setTimeout(() => {
      setIsLeaving(true)
      setTimeout(() => onDismiss(item.id), 200)
    }, TOAST_DURATION)

    return () => {
      cancelAnimationFrame(frame)
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [item.id, onDismiss])

  const handleClose = () => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setIsLeaving(true)
    setTimeout(() => onDismiss(item.id), 200)
  }

  return (
    <div
      className={`
        bg-surface border border-border border-l-4 ${colors.border}
        rounded-[var(--radius-lg)] shadow-lg
        px-4 py-3 flex items-center gap-3 min-w-[300px] max-w-[400px]
        transition-all duration-200 ease-out
        ${isVisible && !isLeaving
          ? "translate-x-0 opacity-100"
          : "translate-x-full opacity-0"
        }
      `}
      role="alert"
    >
      <Icon size={18} className={`${colors.icon} shrink-0`} />
      <p className="flex-1 text-sm text-text">{item.message}</p>
      <button
        onClick={handleClose}
        className="shrink-0 p-1 rounded-[var(--radius-sm)] text-text-tertiary hover:text-text hover:bg-surface-hover transition-colors"
        aria-label="Dismiss"
      >
        <X size={14} />
      </button>
    </div>
  )
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const toast = useCallback((message: string, type: ToastType = "info") => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    setToasts((prev) => [...prev, { id, message, type }])
  }, [])

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-auto">
        {toasts.map((item) => (
          <ToastMessage key={item.id} item={item} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error("useToast must be used within a ToastProvider")
  return ctx
}
