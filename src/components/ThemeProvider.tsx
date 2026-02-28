"use client"

import {
    createContext,
    useContext,
    useState,
    useEffect,
    ReactNode,
} from "react"

type Theme = "dark" | "light"

interface ThemeContextValue {
    theme: Theme
    setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
    const [theme, setThemeState] = useState<Theme>("dark")

    // On mount: read from localStorage first, then try to fetch from session
    useEffect(() => {
        const stored = localStorage.getItem("cally-theme") as Theme | null
        if (stored === "dark" || stored === "light") {
            setThemeState(stored)
            applyTheme(stored)
        }

        // Also try fetching the user's saved preference from the session
        fetch("/api/user/profile")
            .then((res) => {
                if (!res.ok) return null
                return res.json()
            })
            .then((data) => {
                if (data?.theme === "dark" || data?.theme === "light") {
                    setThemeState(data.theme)
                    applyTheme(data.theme)
                    localStorage.setItem("cally-theme", data.theme)
                }
            })
            .catch(() => {
                // Silently ignore - use stored/default
            })
    }, [])

    const applyTheme = (t: Theme) => {
        const root = document.documentElement
        if (t === "dark") {
            root.classList.add("dark")
            root.classList.remove("light")
        } else {
            root.classList.add("light")
            root.classList.remove("dark")
        }
    }

    const setTheme = (newTheme: Theme) => {
        setThemeState(newTheme)
        applyTheme(newTheme)
        localStorage.setItem("cally-theme", newTheme)
    }

    return (
        <ThemeContext.Provider value={{ theme, setTheme }}>
            {children}
        </ThemeContext.Provider>
    )
}

export function useTheme(): ThemeContextValue {
    const ctx = useContext(ThemeContext)
    if (!ctx) {
        throw new Error("useTheme must be used within a ThemeProvider")
    }
    return ctx
}
