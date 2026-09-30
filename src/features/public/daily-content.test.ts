import { getDailyScriptureAssignment, isPlaylistDate, monthlyScriptureSchedule } from './daily-content'

describe('the 30-day initiative playlist', () => {
  it('runs only from October 1 through October 30, 2026', () => {
    expect(isPlaylistDate('2026-09-30')).toBe(false)
    expect(isPlaylistDate('2026-10-01')).toBe(true)
    expect(isPlaylistDate('2026-10-30')).toBe(true)
    expect(isPlaylistDate('2026-10-31')).toBe(false)
    expect(isPlaylistDate('2026-11-01')).toBe(false)
  })
})

describe('the monthly Scripture cycle', () => {
  it('follows the supplied five-Psalm plan and matching Proverbs chapters', () => {
    expect(monthlyScriptureSchedule).toHaveLength(30)
    expect(getDailyScriptureAssignment(1)).toEqual({
      day: 1, morning: 'Psalms 1–2', noon: 'Psalm 3', evening: 'Psalms 4–5', proverb: 'Proverbs 1',
    })
    expect(getDailyScriptureAssignment(5)).toEqual({
      day: 5, morning: 'Psalms 21–22', noon: 'Psalm 23', evening: 'Psalms 24–25', proverb: 'Proverbs 5',
    })
    expect(getDailyScriptureAssignment(14)).toEqual({
      day: 14, morning: 'Psalms 66–67', noon: 'Psalm 68', evening: 'Psalms 69–70', proverb: 'Proverbs 14',
    })
    expect(getDailyScriptureAssignment(30)).toEqual({
      day: 30, morning: 'Psalms 146–147', noon: 'Psalm 148', evening: 'Psalms 149–150', proverb: 'Proverbs 30',
    })
  })

  it('assigns no new Scripture on day 31 or invalid days', () => {
    expect(getDailyScriptureAssignment(31)).toBeUndefined()
    expect(getDailyScriptureAssignment(0)).toBeUndefined()
    expect(getDailyScriptureAssignment(1.5)).toBeUndefined()
  })
})
