"use client"

import { SessionProvider } from "next-auth/react"
import { ReactNode } from "react"
import { ThemeProvider } from "./ThemeProvider"
import { ToastProvider } from "./ui/Toast"
import { BrandingProvider } from "./BrandingProvider"

export default function Providers({ children }: { children: ReactNode }) {
    return (
        <SessionProvider>
            <ThemeProvider>
                <BrandingProvider>
                    <ToastProvider>
                        {children}
                    </ToastProvider>
                </BrandingProvider>
            </ThemeProvider>
        </SessionProvider>
    )
}
