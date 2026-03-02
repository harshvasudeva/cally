import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

// Calendarific API response types
interface CalendarificHoliday {
  name: string
  description: string
  country: { id: string; name: string }
  date: { iso: string }
  type: string[]
  primary_type: string
  canonical_url: string
  urlid: string
  locations: string
  states: string | { id: number; abbrev: string; name: string }[] | "All"
}

interface CalendarificResponse {
  meta: { code: number }
  response: { holidays: CalendarificHoliday[] }
}

// Nager.Date fallback types
interface NagerHoliday {
  date: string
  localName: string
  name: string
  countryCode: string
  fixed: boolean
  global: boolean
  counties: string[] | null
  launchYear: number | null
  types: string[]
}

interface SimplifiedHoliday {
  date: string
  name: string
  localName: string
  types: string[]
  global: boolean
}

// Attempt to fetch holidays from Calendarific (230+ countries)
async function fetchFromCalendarific(
  countryCode: string,
  year: number,
  apiKey: string
): Promise<SimplifiedHoliday[] | null> {
  try {
    const url = `https://calendarific.com/api/v2/holidays?api_key=${apiKey}&country=${countryCode}&year=${year}`
    const res = await fetch(url, { next: { revalidate: 86400 } })

    if (!res.ok) return null

    const data: CalendarificResponse = await res.json()
    if (data.meta.code !== 200 || !data.response?.holidays) return null

    return data.response.holidays.map(h => ({
      date: h.date.iso.split("T")[0], // Ensure YYYY-MM-DD format
      name: h.name,
      localName: h.name, // Calendarific doesn't distinguish local/english names
      types: h.type,
      global: h.locations === "All" || h.states === "All",
    }))
  } catch {
    return null
  }
}

// Fallback: Nager.Date (~120 countries)
async function fetchFromNagerDate(
  countryCode: string,
  year: number
): Promise<SimplifiedHoliday[] | null> {
  try {
    const res = await fetch(
      `https://date.nager.at/api/v3/PublicHolidays/${year}/${countryCode}`,
      { next: { revalidate: 86400 } }
    )
    if (!res.ok) return null

    const holidays: NagerHoliday[] = await res.json()
    if (!Array.isArray(holidays) || holidays.length === 0) return null

    return holidays.map(h => ({
      date: h.date,
      name: h.name,
      localName: h.localName,
      types: h.types,
      global: h.global,
    }))
  } catch {
    return null
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const countryCode = searchParams.get("country")
    const year = searchParams.get("year") || new Date().getFullYear().toString()

    if (!countryCode || !/^[A-Z]{2}$/.test(countryCode)) {
      return NextResponse.json(
        { error: "Valid ISO 3166-1 alpha-2 country code is required (e.g. US, GB, IN)" },
        { status: 400 }
      )
    }

    const yearNum = parseInt(year)
    if (isNaN(yearNum) || yearNum < 2000 || yearNum > 2100) {
      return NextResponse.json(
        { error: "Year must be between 2000 and 2100" },
        { status: 400 }
      )
    }

    let holidays: SimplifiedHoliday[] | null = null
    let provider = "none"

    // 1. Try Calendarific first (best coverage: 230+ countries)
    const calendarificKey = process.env.CALENDARIFIC_API_KEY
    if (calendarificKey) {
      holidays = await fetchFromCalendarific(countryCode, yearNum, calendarificKey)
      if (holidays) provider = "calendarific"
    }

    // 2. Fallback to Nager.Date (~120 countries)
    if (!holidays) {
      holidays = await fetchFromNagerDate(countryCode, yearNum)
      if (holidays) provider = "nager"
    }

    if (!holidays || holidays.length === 0) {
      return NextResponse.json(
        {
          error: `No holidays found for ${countryCode} in ${yearNum}.${!calendarificKey ? ' Add CALENDARIFIC_API_KEY to .env for 230+ country support.' : ''}`,
        },
        { status: 404 }
      )
    }

    // De-duplicate by date+name (in case both providers return similar data)
    const seen = new Set<string>()
    const unique = holidays.filter(h => {
      const key = `${h.date}|${h.name}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })

    return NextResponse.json({ holidays: unique, provider })
  } catch (error) {
    console.error("Error fetching holidays:", error)
    return NextResponse.json(
      { error: "Failed to fetch holidays" },
      { status: 500 }
    )
  }
}
