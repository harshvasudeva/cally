import { NextAuthOptions } from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import CredentialsProvider from "next-auth/providers/credentials"
import GoogleProvider from "next-auth/providers/google"
import DiscordProvider from "next-auth/providers/discord"
import TwitterProvider from "next-auth/providers/twitter"
import FacebookProvider from "next-auth/providers/facebook"
import AppleProvider from "next-auth/providers/apple"
import bcrypt from "bcryptjs"
import prisma from "./prisma"
import { env } from "./env"
import { createAuditLog } from "./audit"

export const authOptions: NextAuthOptions = {
    adapter: PrismaAdapter(prisma),
    providers: [
        // Email + Password login
        CredentialsProvider({
            name: "credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    throw new Error("Email and password are required")
                }

                const email = credentials.email.trim().toLowerCase()
                const user = await prisma.user.findUnique({ where: { email } })

                if (!user || !user.password) {
                    throw new Error("Invalid email or password")
                }

                // Check account lockout
                if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
                    const minutes = Math.ceil((new Date(user.lockedUntil).getTime() - Date.now()) / 60000)
                    throw new Error(`Account locked. Try again in ${minutes} minute(s).`)
                }

                // Verify password
                const isValid = await bcrypt.compare(credentials.password, user.password)

                if (!isValid) {
                    // Increment failed attempts
                    const settings = await prisma.settings.findFirst()
                    const maxAttempts = settings?.maxLoginAttempts ?? 5
                    const lockoutMinutes = settings?.lockoutDuration ?? 15
                    const newAttempts = user.failedLoginAttempts + 1

                    const updateData: Record<string, unknown> = {
                        failedLoginAttempts: newAttempts,
                    }

                    if (newAttempts >= maxAttempts) {
                        updateData.lockedUntil = new Date(Date.now() + lockoutMinutes * 60 * 1000)
                        await createAuditLog({
                            action: "ACCOUNT_LOCKED",
                            entity: "User",
                            entityId: user.id,
                            details: { attempts: newAttempts, lockoutMinutes },
                            userId: user.id,
                        })
                    }

                    await prisma.user.update({
                        where: { id: user.id },
                        data: updateData,
                    })

                    await createAuditLog({
                        action: "LOGIN_FAILED",
                        entity: "User",
                        entityId: user.id,
                        details: { email, attempt: newAttempts },
                        userId: user.id,
                    })

                    throw new Error("Invalid email or password")
                }

                // Successful login — reset failed attempts
                if (user.failedLoginAttempts > 0 || user.lockedUntil) {
                    await prisma.user.update({
                        where: { id: user.id },
                        data: { failedLoginAttempts: 0, lockedUntil: null },
                    })
                }

                await createAuditLog({
                    action: "LOGIN",
                    entity: "User",
                    entityId: user.id,
                    details: { method: "credentials" },
                    userId: user.id,
                })

                return {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    image: user.image,
                }
            },
        }),
        // Only register providers whose credentials are configured
        ...(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
            ? [
                GoogleProvider({
                    clientId: env.GOOGLE_CLIENT_ID,
                    clientSecret: env.GOOGLE_CLIENT_SECRET,
                }),
            ]
            : []),
        ...(env.DISCORD_CLIENT_ID && env.DISCORD_CLIENT_SECRET
            ? [
                DiscordProvider({
                    clientId: env.DISCORD_CLIENT_ID,
                    clientSecret: env.DISCORD_CLIENT_SECRET,
                }),
            ]
            : []),
        ...(env.TWITTER_CLIENT_ID && env.TWITTER_CLIENT_SECRET
            ? [
                TwitterProvider({
                    clientId: env.TWITTER_CLIENT_ID,
                    clientSecret: env.TWITTER_CLIENT_SECRET,
                    version: "2.0",
                }),
            ]
            : []),
        ...(env.FACEBOOK_CLIENT_ID && env.FACEBOOK_CLIENT_SECRET
            ? [
                FacebookProvider({
                    clientId: env.FACEBOOK_CLIENT_ID,
                    clientSecret: env.FACEBOOK_CLIENT_SECRET,
                }),
            ]
            : []),
        ...(env.APPLE_ID && env.APPLE_SECRET
            ? [
                AppleProvider({
                    clientId: env.APPLE_ID,
                    clientSecret: env.APPLE_SECRET,
                }),
            ]
            : []),
    ],
    session: {
        strategy: "jwt",
        maxAge: 30 * 24 * 60 * 60, // 30 days
    },
    cookies: {
        sessionToken: {
            // __Secure- prefix requires secure:true — only use in production (HTTPS)
            name: env.NODE_ENV === "production"
                ? "__Secure-next-auth.session-token"
                : "next-auth.session-token",
            options: {
                httpOnly: true,
                sameSite: "lax",
                path: "/",
                secure: env.NODE_ENV === "production",
            },
        },
    },
    callbacks: {
        async session({ session, token }) {
            if (session.user && token.sub) {
                session.user.id = token.sub
            }
            // Use cached data from JWT token instead of querying DB on every request
            if (token) {
                (session.user as any).role = token.role;
                (session.user as any).slug = token.slug;
                (session.user as any).timezone = token.timezone;
                (session.user as any).theme = token.theme;
                (session.user as any).onboardingCompleted = token.onboardingCompleted;
            }
            return session
        },
        async jwt({ token, user, trigger }) {
            // Initial sign in - populate token with user data
            if (user) {
                const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
                if (dbUser) {
                    token.role = dbUser.role;
                    token.slug = dbUser.slug;
                    token.timezone = dbUser.timezone;
                    token.theme = dbUser.theme;
                    token.onboardingCompleted = dbUser.onboardingCompleted;

                    // Generate slug if missing (first OAuth login via Adapter)
                    if (!dbUser.slug) {
                        const baseSlug = (user.name || "user").toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")
                        let slug = baseSlug
                        let counter = 1
                        while (await prisma.user.findUnique({ where: { slug } })) {
                            slug = `${baseSlug}-${counter}`
                            counter++
                        }
                        // First user becomes admin
                        const count = await prisma.user.count();
                        const role = count === 1 ? "ADMIN" : "USER";

                        await prisma.user.update({
                            where: { id: user.id },
                            data: {
                                slug,
                                role: dbUser.role === "USER" ? role : dbUser.role,
                            }
                        });

                        token.slug = slug;
                        token.role = dbUser.role === "USER" ? role : dbUser.role;

                        // Initialize Availability/Types if missing
                        const types = await prisma.appointmentType.count({ where: { userId: user.id } });
                        if (types === 0) {
                            await prisma.appointmentType.create({
                                data: {
                                    name: "30 Minute Meeting",
                                    slug: "30min",
                                    duration: 30,
                                    userId: user.id
                                }
                            });
                            await prisma.availability.createMany({
                                data: [1, 2, 3, 4, 5].map(d => ({
                                    userId: user.id,
                                    dayOfWeek: d,
                                    startTime: "09:00",
                                    endTime: "17:00"
                                }))
                            });
                        }
                    }
                }
            }

            // Refresh token data when session is updated (e.g. profile changes)
            if (trigger === "update" && token.sub) {
                const freshUser = await prisma.user.findUnique({ where: { id: token.sub } });
                if (freshUser) {
                    token.role = freshUser.role;
                    token.slug = freshUser.slug;
                    token.timezone = freshUser.timezone;
                    token.theme = freshUser.theme;
                    token.onboardingCompleted = freshUser.onboardingCompleted;
                }
            }

            return token
        }
    },
    pages: {
        signIn: "/login",
        error: "/login"
    },
    secret: env.NEXTAUTH_SECRET,
}
