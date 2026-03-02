import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

interface RestCountry {
  cca2: string
  name: { common: string }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const hasCalendarific = !!process.env.CALENDARIFIC_API_KEY

    // Fetch full country list from RestCountries API (250+ countries)
    // and which countries have holiday support via available providers
    const fetches: Promise<Response>[] = [
      fetch("https://restcountries.com/v3.1/all?fields=cca2,name", {
        next: { revalidate: 86400 },
      }),
    ]

    // Only check Nager.Date supported countries if Calendarific isn't configured
    // (Calendarific supports 230+ countries so most will be available)
    if (!hasCalendarific) {
      fetches.push(
        fetch("https://date.nager.at/api/v3/AvailableCountries", {
          next: { revalidate: 86400 },
        })
      )
    }

    const responses = await Promise.all(fetches)
    const countriesRes = responses[0]

    if (!countriesRes.ok) {
      return NextResponse.json({ error: "Failed to fetch countries" }, { status: 502 })
    }

    const restCountries: RestCountry[] = await countriesRes.json()

    // Build a set of country codes that have holiday data
    let holidayCodes = new Set<string>()
    if (hasCalendarific) {
      // Calendarific supports virtually all countries — mark all as available
      holidayCodes = new Set(restCountries.map(c => c.cca2))
    } else if (responses[1]?.ok) {
      const nagerCountries: { countryCode: string }[] = await responses[1].json()
      holidayCodes = new Set(nagerCountries.map(c => c.countryCode))
    }

    const countries = restCountries
      .map(c => ({
        countryCode: c.cca2,
        name: c.name.common,
        holidaysAvailable: holidayCodes.has(c.cca2),
      }))
      .sort((a, b) => a.name.localeCompare(b.name))

    return NextResponse.json(countries)
  } catch (error) {
    console.error("Error fetching countries:", error)
    return NextResponse.json({ error: "Failed to fetch countries" }, { status: 500 })
  }
}
