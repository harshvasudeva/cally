import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import os from "os"

export const dynamic = "force-dynamic"

export async function GET() {
  const start = Date.now()
  let database: "connected" | "error" = "connected"
  let dbLatency = 0

  try {
    const dbStart = Date.now()
    await prisma.settings.count()
    dbLatency = Date.now() - dbStart
  } catch {
    database = "error"
  }

  const memUsage = process.memoryUsage()

  return NextResponse.json({
    status: database === "connected" ? "healthy" : "degraded",
    version: process.env.npm_package_version || "1.0.0",
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    database: {
      status: database,
      latencyMs: dbLatency,
    },
    system: {
      platform: os.platform(),
      nodeVersion: process.version,
      memoryUsedMB: Math.round(memUsage.heapUsed / 1024 / 1024),
      memoryTotalMB: Math.round(memUsage.heapTotal / 1024 / 1024),
      cpuCount: os.cpus().length,
      loadAvg: os.loadavg(),
    },
    responseTimeMs: Date.now() - start,
  })
}
