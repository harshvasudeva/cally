/**
 * Graceful shutdown handler for Cally.
 * Registers process signal handlers to cleanly close database connections
 * and finish pending requests before exiting.
 *
 * This module is imported by instrumentation.ts (Next.js lifecycle hook)
 * so it runs once when the server starts.
 */

import prisma from "./prisma"

let isShuttingDown = false

async function gracefulShutdown(signal: string) {
    if (isShuttingDown) return
    isShuttingDown = true

    console.log(`\n[shutdown] Received ${signal}. Starting graceful shutdown...`)

    // Give in-flight requests a moment to complete
    const shutdownTimeout = setTimeout(() => {
        console.error("[shutdown] Graceful shutdown timed out after 10s, forcing exit")
        process.exit(1)
    }, 10_000)

    try {
        // Disconnect Prisma / close DB connections
        await prisma.$disconnect()
        console.log("[shutdown] Database connections closed")
    } catch (err) {
        console.error("[shutdown] Error disconnecting database:", err)
    }

    clearTimeout(shutdownTimeout)
    console.log("[shutdown] Shutdown complete")
    process.exit(0)
}

export function registerShutdownHandlers() {
    process.on("SIGTERM", () => gracefulShutdown("SIGTERM"))
    process.on("SIGINT", () => gracefulShutdown("SIGINT"))
    process.on("SIGUSR2", () => gracefulShutdown("SIGUSR2")) // nodemon restart

    // Catch uncaught exceptions / unhandled rejections to log before crashing
    process.on("uncaughtException", (err) => {
        console.error("[fatal] Uncaught exception:", err)
        gracefulShutdown("uncaughtException")
    })

    process.on("unhandledRejection", (reason) => {
        console.error("[fatal] Unhandled rejection:", reason)
        // Don't exit for unhandled rejections — just log
    })

    console.log("[shutdown] Graceful shutdown handlers registered")
}
