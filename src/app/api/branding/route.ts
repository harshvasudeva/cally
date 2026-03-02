import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"

/**
 * Public endpoint — returns site branding (name, color, logo) and maintenance status.
 * No authentication required so the login page and public pages can use it.
 */
export async function GET() {
    try {
        const settings = await prisma.settings.findFirst({
            select: {
                siteName: true,
                primaryColor: true,
                logoUrl: true,
                maintenanceMode: true,
            },
        })

        return NextResponse.json({
            siteName: settings?.siteName || "Cally",
            primaryColor: settings?.primaryColor || "#3b82f6",
            logoUrl: settings?.logoUrl || null,
            maintenanceMode: settings?.maintenanceMode || false,
        }, {
            headers: {
                "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
            },
        })
    } catch {
        return NextResponse.json({
            siteName: "Cally",
            primaryColor: "#3b82f6",
            logoUrl: null,
            maintenanceMode: false,
        })
    }
}
