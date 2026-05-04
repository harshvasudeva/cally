"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "@/lib/auth-react-compat"

export default function Home() {
  const router = useRouter()
  const { status } = useSession()

  useEffect(() => {
    if (status === "authenticated") router.replace("/dashboard")
    if (status === "unauthenticated") router.replace("/login")
  }, [router, status])

  return null
}

