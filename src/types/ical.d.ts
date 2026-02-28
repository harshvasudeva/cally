declare module 'ical' {
  interface VEvent {
    type: string
    summary?: string
    description?: string
    location?: string
    start?: Date
    end?: Date
    uid?: string
    [key: string]: any
  }

  function parseICS(data: string): Record<string, VEvent>

  export { parseICS }
}
