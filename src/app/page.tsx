import { redirect } from "next/navigation"
import { getServerSession } from "@/lib/server-session"
import { authOptions } from "@/lib/auth"

export default async function Home() {
  const session = await getServerSession(authOptions)

  if (session) {
    redirect("/dashboard")
  } else {
    redirect("/login")
  }
}
