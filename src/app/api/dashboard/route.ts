import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"

// Dashboard stats API
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = (session.user as { id: string }).id
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const todayEnd = new Date(todayStart.getTime() + 86400000)
    const weekStart = new Date(todayStart.getTime() - todayStart.getDay() * 86400000)
    const weekEnd = new Date(weekStart.getTime() + 7 * 86400000)
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1)

    const [
      totalAppointments,
      pendingCount,
      confirmedCount,
      cancelledCount,
      todayAppointments,
      weekAppointments,
      monthAppointments,
      upcomingAppointments,
      recentAudit,
      totalEvents,
    ] = await Promise.all([
      prisma.appointment.count({ where: { userId } }),
      prisma.appointment.count({ where: { userId, status: "PENDING" } }),
      prisma.appointment.count({ where: { userId, status: "CONFIRMED" } }),
      prisma.appointment.count({ where: { userId, status: "CANCELLED" } }),
      prisma.appointment.findMany({
        where: {
          userId,
          status: { not: "CANCELLED" },
          start: { gte: todayStart, lt: todayEnd },
        },
        include: { appointmentType: true },
        orderBy: { start: "asc" },
      }),
      prisma.appointment.count({
        where: {
          userId,
          status: { not: "CANCELLED" },
          start: { gte: weekStart, lt: weekEnd },
        },
      }),
      prisma.appointment.count({
        where: {
          userId,
          createdAt: { gte: monthStart, lt: monthEnd },
        },
      }),
      prisma.appointment.findMany({
        where: {
          userId,
          status: { not: "CANCELLED" },
          start: { gte: now },
        },
        include: { appointmentType: true },
        orderBy: { start: "asc" },
        take: 5,
      }),
      prisma.auditLog.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
      prisma.event.count({ where: { userId } }),
    ])

    // Busiest day of week
    const allConfirmed = await prisma.appointment.findMany({
      where: { userId, status: "CONFIRMED" },
      select: { start: true },
    })
    const dayCount = new Array(7).fill(0)
    allConfirmed.forEach((a) => {
      dayCount[new Date(a.start).getDay()]++
    })
    const busiestDay = dayCount.indexOf(Math.max(...dayCount))
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

    return NextResponse.json({
      stats: {
        total: totalAppointments,
        pending: pendingCount,
        confirmed: confirmedCount,
        cancelled: cancelledCount,
        todayCount: todayAppointments.length,
        weekCount: weekAppointments,
        monthCount: monthAppointments,
        totalEvents,
        busiestDay: dayNames[busiestDay],
      },
      todayAppointments,
      upcomingAppointments,
      recentActivity: recentAudit,
    })
  } catch (error) {
    console.error("Dashboard error:", error)
    return NextResponse.json({ error: "Failed to load dashboard" }, { status: 500 })
  }
}
