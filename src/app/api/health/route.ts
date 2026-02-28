import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"

export async function GET() {
  let database: "connected" | "error" = "connected"

  try {
    await prisma.settings.count()
  } catch {
    database = "error"
  }

  return NextResponse.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database,
  })
}
