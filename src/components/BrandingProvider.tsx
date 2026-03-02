"use client"

import { createContext, useContext, useEffect, useState, useMemo, type ReactNode } from "react"

interface BrandingConfig {
    siteName: string
    primaryColor: string
    logoUrl: string | null
    maintenanceMode: boolean
    loaded: boolean
}

const defaultBranding: BrandingConfig = {
    siteName: "Cally",
    primaryColor: "#3b82f6",
    logoUrl: null,
    maintenanceMode: false,
    loaded: false,
}

const BrandingContext = createContext<BrandingConfig>(defaultBranding)

export function useBranding() {
    return useContext(BrandingContext)
}

export function BrandingProvider({ children }: { children: ReactNode }) {
    const [branding, setBranding] = useState<BrandingConfig>(defaultBranding)

    useEffect(() => {
        fetch("/api/branding")
            .then((res) => (res.ok ? res.json() : null))
            .then((data) => {
                if (data) {
                    setBranding({
                        siteName: data.siteName || "Cally",
                        primaryColor: data.primaryColor || "#3b82f6",
                        logoUrl: data.logoUrl || null,
                        maintenanceMode: data.maintenanceMode || false,
                        loaded: true,
                    })

                    // Apply primary color as CSS custom property
                    if (data.primaryColor && data.primaryColor !== "#3b82f6") {
                        const root = document.documentElement
                        root.style.setProperty("--primary", data.primaryColor)
                        // Generate lighter variant (add opacity)
                        root.style.setProperty("--primary-light", data.primaryColor + "1a")
                        root.style.setProperty("--primary-hover", data.primaryColor + "dd")
                    }
                } else {
                    setBranding((b) => ({ ...b, loaded: true }))
                }
            })
            .catch(() => {
                setBranding((b) => ({ ...b, loaded: true }))
            })
    }, [])

    const value = useMemo(() => branding, [branding.siteName, branding.primaryColor, branding.logoUrl, branding.maintenanceMode, branding.loaded])

    return (
        <BrandingContext.Provider value={value}>
            {children}
        </BrandingContext.Provider>
    )
}
