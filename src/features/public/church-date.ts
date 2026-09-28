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
