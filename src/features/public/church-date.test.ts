import { formatChurchDayHeading, getChurchDay } from './church-date'
import { getTodayPrayerFocus } from './mock-data'

describe('church prayer day', () => {
  it('changes at Denver midnight rather than the visitor’s local midnight', () => {
    const before = getChurchDay(new Date('2026-10-01T05:59:00Z'))
    const after = getChurchDay(new Date('2026-10-01T06:01:00Z'))

    expect(before).toEqual({ dateKey: '2026-09-30', dayOfMonth: 30, dayOfWeek: 3 })
    expect(after).toEqual({ dateKey: '2026-10-01', dayOfMonth: 1, dayOfWeek: 4 })
    expect(getTodayPrayerFocus(new Date('2026-10-01T05:59:00Z')).title).toBe('Awakening (Next Gen)')
    expect(getTodayPrayerFocus(new Date('2026-10-01T06:01:00Z')).title).toBe('Family')
  })
})


describe('daily heading', () => {
  it('uses short weekday and month names with correct ordinal endings', () => {
    expect(formatChurchDayHeading('2026-09-30')).toBe('Wed, Sep 30th')
    for (const [day, suffix] of [[1, 'st'], [2, 'nd'], [3, 'rd'], [11, 'th'], [12, 'th'], [13, 'th'], [21, 'st'], [22, 'nd'], [23, 'rd'], [31, 'st']] as const) {
      expect(formatChurchDayHeading(`2026-10-${String(day).padStart(2, '0')}`)).toMatch(new RegExp(`${day}${suffix}$`))
    }
  })

  it('keeps the Denver day stable across the November daylight-saving fallback', () => {
    expect(getChurchDay(new Date('2026-11-01T07:30:00Z'))).toEqual(getChurchDay(new Date('2026-11-01T08:30:00Z')))
  })
})
