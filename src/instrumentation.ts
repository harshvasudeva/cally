/**
 * Next.js Instrumentation Hook
 * https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 *
 * This runs once when the Next.js server starts.
 * Used to register graceful shutdown handlers, initialize monitoring, etc.
 */

export async function register() {
    // Only run shutdown handlers on the server (not during build or in edge runtime)
    if (process.env.NEXT_RUNTIME === "nodejs") {
        const { registerShutdownHandlers } = await import("./lib/shutdown")
        registerShutdownHandlers()
    }
}
