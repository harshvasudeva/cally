"use client"

import {
    createContext,
    useContext,
    useState,
    useCallback,
    useRef,
    useEffect,
    ReactNode,
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

const TOAST_DURATION = 5000

const iconMap: Record<ToastType, typeof CheckCircle> = {
    success: CheckCircle,
    error: XCircle,
    warning: AlertTriangle,
    info: Info,
}

const colorMap: Record<ToastType, { border: string; icon: string }> = {
    success: { border: "border-l-emerald-500", icon: "text-emerald-400" },
    error: { border: "border-l-red-500", icon: "text-red-400" },
    warning: { border: "border-l-amber-500", icon: "text-amber-400" },
    info: { border: "border-l-sky-500", icon: "text-sky-400" },
}

function ToastMessage({
    item,
    onDismiss,
}: {
    item: ToastItem
    onDismiss: (id: string) => void
}) {
    const [isVisible, setIsVisible] = useState(false)
    const [isLeaving, setIsLeaving] = useState(false)
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    const Icon = iconMap[item.type]
    const colors = colorMap[item.type]

    useEffect(() => {
        // Trigger entrance animation on next frame
        const frame = requestAnimationFrame(() => setIsVisible(true))

        timerRef.current = setTimeout(() => {
            setIsLeaving(true)
            setTimeout(() => onDismiss(item.id), 300)
        }, TOAST_DURATION)

        return () => {
            cancelAnimationFrame(frame)
            if (timerRef.current) clearTimeout(timerRef.current)
        }
    }, [item.id, onDismiss])

    const handleClose = () => {
        if (timerRef.current) clearTimeout(timerRef.current)
        setIsLeaving(true)
        setTimeout(() => onDismiss(item.id), 300)
    }

    return (
        <div
            className={`
                glass rounded-lg border-l-4 ${colors.border}
                px-4 py-3 shadow-lg shadow-black/20
                flex items-center gap-3 min-w-[320px] max-w-[420px]
                transition-all duration-300 ease-out
                ${isVisible && !isLeaving
                    ? "translate-x-0 opacity-100"
                    : "translate-x-full opacity-0"
                }
            `}
            role="alert"
        >
            <Icon size={20} className={`${colors.icon} shrink-0`} />
            <p className="flex-1 text-sm text-slate-200">{item.message}</p>
            <button
                onClick={handleClose}
                className="shrink-0 p-1 rounded hover:bg-slate-700/50 text-slate-400 hover:text-white transition-colors"
                aria-label="Dismiss"
            >
                <X size={16} />
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

            {/* Toast container - bottom right */}
            <div className="fixed bottom-6 right-6 z-[9999] flex flex-col-reverse gap-3 pointer-events-auto">
                {toasts.map((item) => (
                    <ToastMessage key={item.id} item={item} onDismiss={dismiss} />
                ))}
            </div>
        </ToastContext.Provider>
    )
}

export function useToast(): ToastContextValue {
    const ctx = useContext(ToastContext)
    if (!ctx) {
        throw new Error("useToast must be used within a ToastProvider")
    }
    return ctx
}
