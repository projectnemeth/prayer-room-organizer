const churchTimeZone = 'America/Denver'

const weekdayNumbers: Record<string, number> = {
  Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
}

/** The shared prayer day follows Denver time, regardless of the visitor's time zone. */
export function getChurchDay(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: churchTimeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
  }).formatToParts(date)
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? ''
  const weekday = weekdayNumbers[value('weekday')]

  return {
    dateKey: `${value('year')}-${value('month')}-${value('day')}`,
    dayOfMonth: Number(value('day')),
    dayOfWeek: weekday ?? 0,
  }
}

/** Format the same Denver-local day used by every daily resource. */
export function formatChurchDayHeading(dateKey: string) {
  const date = new Date(`${dateKey}T12:00:00Z`)
  const day = Number(dateKey.slice(-2))
  const suffix = day % 100 >= 11 && day % 100 <= 13
    ? 'th'
    : ({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[day % 10] ?? 'th'
  const weekday = new Intl.DateTimeFormat('en-US', { timeZone: churchTimeZone, weekday: 'short' }).format(date)
  const month = new Intl.DateTimeFormat('en-US', { timeZone: churchTimeZone, month: 'short' }).format(date)
  return `${weekday}, ${month} ${day}${suffix}`
}
