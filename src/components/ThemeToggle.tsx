"use client"

import { Sun, Moon } from "lucide-react"
import { useTheme } from "./ThemeProvider"

export default function ThemeToggle() {
    const { theme, setTheme } = useTheme()

    const toggle = async () => {
        const next = theme === "dark" ? "light" : "dark"
        setTheme(next)

        // Persist to the server
        try {
            await fetch("/api/user/profile", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ theme: next }),
            })
        } catch {
            // Preference is already saved locally via ThemeProvider
        }
    }

    return (
        <button
            onClick={toggle}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            aria-label="Toggle theme"
        >
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
        </button>
    )
}
