import { getChurchDay } from './church-date'
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
