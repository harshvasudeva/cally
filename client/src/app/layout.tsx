import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import Providers from "@/components/Providers"
import CommandPalette from "@/components/CommandPalette"
import AppShell from "@/components/AppShell"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter"
})

export const metadata: Metadata = {
  title: "Cally - Self-Hosted Calendar & Scheduling",
  description: "A powerful self-hosted calendar application with appointment scheduling, availability management, and more.",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("cally-theme");document.documentElement.classList.add(t==="light"?"light":"dark")}catch(e){document.documentElement.classList.add("dark")}})()`,
          }}
        />
      </head>
      <body className={`${inter.variable} font-sans antialiased`}>
        <Providers>
          <CommandPalette />
          <AppShell>
            {children}
          </AppShell>
        </Providers>
      </body>
    </html>
  )
}
