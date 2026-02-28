import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import Providers from "@/components/Providers"
import CommandPalette from "@/components/CommandPalette"

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
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-sans antialiased`}>
        <Providers>
          <CommandPalette />
          {children}
        </Providers>
      </body>
    </html>
  )
}
