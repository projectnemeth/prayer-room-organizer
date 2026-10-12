export const churchTimeZone = 'America/Denver'

const weekdayNumbers: Record<string, number> = {
  Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
}

/** An actual instant belongs to the same Denver prayer day for every visitor. */
export function getChurchDay(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: churchTimeZone, year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short',
  }).formatToParts(date)
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? ''
  return {
    dateKey: `${value('year')}-${value('month')}-${value('day')}`,
    dayOfMonth: Number(value('day')),
    dayOfWeek: weekdayNumbers[value('weekday')] ?? 0,
  }
}

/** Calendar dates use UTC only as a container; they are not meeting instants. */
export function calendarDate(dateKey: string) {
  return new Date(`${dateKey}T12:00:00Z`)
}

export function calendarDateKey(date: Date) {
  return date.toISOString().slice(0, 10)
}

export function addCalendarDays(date: Date, count: number) {
  const next = new Date(date)
  next.setUTCDate(next.getUTCDate() + count)
  return next
}

export function addCalendarMonths(date: Date, count: number) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + count, 1, 12))
}

export function startOfCalendarMonth(date: Date) {
  return addCalendarMonths(date, 0)
}

export function startOfCalendarWeek(date: Date) {
  return addCalendarDays(date, -date.getUTCDay())
}

export function formatCalendarDate(date: Date, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat('en-US', { ...options, timeZone: 'UTC' }).format(date)
}

export function formatChurchDayHeading(dateKey: string) {
  const date = calendarDate(dateKey)
  const day = date.getUTCDate()
  const suffix = day % 100 >= 11 && day % 100 <= 13
    ? 'th'
    : ({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[day % 10] ?? 'th'
  return `${formatCalendarDate(date, { weekday: 'short' })}, ${formatCalendarDate(date, { month: 'short' })} ${day}${suffix}`
}

/** Format a meeting instant for a datetime-local field explicitly in Denver. */
export function toChurchDateTimeLocal(value: string | Date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: churchTimeZone, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date(value))
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? ''
  return `${part('year')}-${part('month')}-${part('day')}T${part('hour')}:${part('minute')}`
}

/** Resolve Denver wall time without relying on the browser's zone or a fixed UTC offset. */
export function churchDateTimeToIso(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) {
    throw new Error('Enter a valid date and time in America/Denver.')
  }
  const wallTime = new Date(`${value}:00Z`)
  if (!Number.isFinite(wallTime.getTime()) || wallTime.toISOString().slice(0, 16) !== value) {
    throw new Error('Enter a valid date and time in America/Denver.')
  }
  // Sample both sides of a possible clock change, then verify every candidate.
  const offsets = new Set([-36, 0, 36].map((hours) => {
    const sample = new Date(wallTime.getTime() + hours * 3_600_000)
    return new Date(`${toChurchDateTimeLocal(sample)}:00Z`).getTime() - sample.getTime()
  }))
  const candidates = [...offsets].map((offset) => new Date(wallTime.getTime() - offset))
    .filter((candidate) => toChurchDateTimeLocal(candidate) === value)
  if (candidates.length === 0) {
    throw new Error('That time does not exist in America/Denver because the clocks move forward. Choose another time.')
  }
  if (candidates.length > 1) {
    throw new Error('That time occurs twice in America/Denver because the clocks move back. Choose a time outside the repeated hour.')
  }
  return candidates[0].toISOString()
}

export function startOfChurchDay(date: Date) {
  return churchDateTimeToIso(`${calendarDateKey(date)}T00:00`)
}
