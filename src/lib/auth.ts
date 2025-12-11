import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import GoogleProvider from "next-auth/providers/google"
import bcrypt from "bcryptjs"
import prisma from "./prisma"

export const authOptions: NextAuthOptions = {
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID || "",
            clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
        }),
        CredentialsProvider({
            name: "credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" }
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    throw new Error("Invalid credentials")
                }

                const user = await prisma.user.findUnique({
                    where: { email: credentials.email }
                })

                if (!user) {
                    throw new Error("User not found")
                }

                const isValid = await bcrypt.compare(credentials.password, user.password)

                if (!isValid) {
                    throw new Error("Invalid password")
                }

                return {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    role: user.role,
                    slug: user.slug,
                    timezone: user.timezone
                }
            }
        })
    ],
    callbacks: {
        async signIn({ user, account }) {
            // Handle Google OAuth sign in
            if (account?.provider === "google") {
                try {
                    const existingUser = await prisma.user.findUnique({
                        where: { email: user.email! }
                    })

                    if (!existingUser) {
                        // Create new user from Google account
                        const baseSlug = (user.name || "user").toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")
                        let slug = baseSlug
                        let counter = 1

                        while (await prisma.user.findUnique({ where: { slug } })) {
                            slug = `${baseSlug}-${counter}`
                            counter++
                        }

                        // Check if this is the first user (make them admin)
                        const userCount = await prisma.user.count()
                        const role = userCount === 0 ? "ADMIN" : "USER"

                        const newUser = await prisma.user.create({
                            data: {
                                email: user.email!,
                                password: "", // No password for OAuth users
                                name: user.name || "User",
                                slug,
                                role,
                                timezone: "UTC",
                                avatarUrl: user.image
                            }
                        })

                        // Create default availability (Mon-Fri 9am-5pm)
                        const defaultAvailability = [1, 2, 3, 4, 5].map((day) => ({
                            dayOfWeek: day,
                            startTime: "09:00",
                            endTime: "17:00",
                            userId: newUser.id
                        }))

                        await prisma.availability.createMany({
                            data: defaultAvailability
                        })

                        // Create default appointment type
                        await prisma.appointmentType.create({
                            data: {
                                name: "30 Minute Meeting",
                                slug: "30min",
                                duration: 30,
                                color: "#3b82f6",
                                description: "A 30 minute meeting",
                                userId: newUser.id
                            }
                        })

                        // Create settings if first user
                        if (userCount === 0) {
                            await prisma.settings.create({
                                data: {}
                            })
                        }
                    }
                    return true
                } catch (error) {
                    console.error("Error during Google sign in:", error)
                    return false
                }
            }
            return true
        },
        async jwt({ token, user, account }) {
            if (account?.provider === "google" && user?.email) {
                // Fetch user from database for Google sign in
                const dbUser = await prisma.user.findUnique({
                    where: { email: user.email }
                })
                if (dbUser) {
                    token.id = dbUser.id
                    token.role = dbUser.role
                    token.slug = dbUser.slug
                    token.timezone = dbUser.timezone
                }
            } else if (user) {
                token.id = user.id
                token.role = (user as { role: string }).role
                token.slug = (user as { slug: string }).slug
                token.timezone = (user as { timezone: string }).timezone
            }
            return token
        },
        async session({ session, token }) {
            if (session.user) {
                (session.user as { id: string }).id = token.id as string
                (session.user as { role: string }).role = token.role as string
                (session.user as { slug: string }).slug = token.slug as string
                (session.user as { timezone: string }).timezone = token.timezone as string
            }
            return session
        }
    },
    pages: {
        signIn: "/login",
        error: "/login"
    },
    session: {
        strategy: "jwt",
        maxAge: 30 * 24 * 60 * 60 // 30 days
    },
    secret: process.env.NEXTAUTH_SECRET
}
