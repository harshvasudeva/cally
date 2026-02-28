
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function GET() {
    const session = await getServerSession(authOptions)

    if (!session?.user || !(session.user as any).id) {
        return new NextResponse("Unauthorized", { status: 401 })
    }

    const accounts = await prisma.account.findMany({
        where: {
            userId: (session.user as any).id
        },
        select: {
            provider: true
        }
    })

    return NextResponse.json(accounts)
}
