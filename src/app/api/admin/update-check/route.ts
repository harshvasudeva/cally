import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import fs from "fs/promises"
import path from "path"

export const dynamic = "force-dynamic"

// GET - Check for updates by comparing local package.json version
export async function GET() {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const role = (session.user as { role?: string }).role
        if (role !== "ADMIN") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }

        // Read local version
        const pkgPath = path.join(process.cwd(), "package.json")
        const pkg = JSON.parse(await fs.readFile(pkgPath, "utf-8"))
        const currentVersion = pkg.version || "1.0.0"

        // Try to fetch latest version from GitHub (or a version endpoint)
        let latestVersion = currentVersion
        let updateAvailable = false
        let releaseNotes = ""
        let releaseUrl = ""

        try {
            const repoUrl = pkg.repository?.url || ""
            // Try GitHub API if repo URL is available
            if (repoUrl.includes("github.com")) {
                const match = repoUrl.match(/github\.com[:/](.+?)(?:\.git)?$/)
                if (match) {
                    const repo = match[1]
                    const res = await fetch(
                        `https://api.github.com/repos/${repo}/releases/latest`,
                        {
                            headers: { Accept: "application/vnd.github.v3+json" },
                            signal: AbortSignal.timeout(5000),
                        }
                    )
                    if (res.ok) {
                        const data = await res.json()
                        latestVersion = data.tag_name?.replace(/^v/, "") || currentVersion
                        updateAvailable = latestVersion !== currentVersion
                        releaseNotes = data.body || ""
                        releaseUrl = data.html_url || ""
                    }
                }
            }
        } catch {
            // If check fails, just report current version
        }

        return NextResponse.json({
            currentVersion,
            latestVersion,
            updateAvailable,
            releaseNotes: releaseNotes.substring(0, 500),
            releaseUrl,
            checkedAt: new Date().toISOString(),
        })
    } catch (error) {
        console.error("Update check error:", error)
        return NextResponse.json({ error: "Failed to check for updates" }, { status: 500 })
    }
}
