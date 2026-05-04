"use client"

import { ReactNode } from "react"
import { toast as sonnerToast } from "sonner"
import { Toaster } from "@/components/ui/sonner"

type ToastType = "success" | "error" | "warning" | "info"

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void
}

// Proxies existing calls to sonner
export function useToast(): ToastContextValue {
  return {
    toast: (message: string, type: ToastType = "info") => {
      switch (type) {
        case "success":
          sonnerToast.success(message)
          break
        case "error":
          sonnerToast.error(message)
          break
        case "warning":
          sonnerToast.warning(message)
          break
        default:
          sonnerToast.info(message)
      }
    },
  }
}

// The provider now simply renders the Sonner Toaster
export function ToastProvider({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <Toaster />
    </>
  )
}
