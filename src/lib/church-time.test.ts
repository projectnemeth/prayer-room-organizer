import {
  addCalendarDays, addCalendarMonths, calendarDate, calendarDateKey,
  churchDateTimeToIso, getChurchDay, startOfChurchDay, toChurchDateTimeLocal,
} from './church-time'

describe('Denver meeting times', () => {
  it.each([
    ['2026-10-30T06:30', '2026-10-30T12:30:00.000Z'],
    ['2026-11-01T00:00', '2026-11-01T06:00:00.000Z'],
    ['2026-11-01T06:30', '2026-11-01T13:30:00.000Z'],
    ['2026-11-16T06:30', '2026-11-16T13:30:00.000Z'],
    ['2027-03-14T00:00', '2027-03-14T07:00:00.000Z'],
    ['2027-03-14T06:30', '2027-03-14T12:30:00.000Z'],
    ['2028-02-29T17:00', '2028-03-01T00:00:00.000Z'],
  ])('saves and reads %s at the correct instant', (local, instant) => {
    expect(churchDateTimeToIso(local)).toBe(instant)
    expect(toChurchDateTimeLocal(instant)).toBe(local)
  })

  it.each(['2027-03-14T02:00', '2027-03-14T02:30'])('rejects a nonexistent spring time: %s', (value) => {
    expect(() => churchDateTimeToIso(value)).toThrow(/does not exist/)
  })

  it('rejects new times in the repeated fall hour instead of guessing', () => {
    expect(() => churchDateTimeToIso('2026-11-01T01:30')).toThrow(/occurs twice/)
    expect(toChurchDateTimeLocal('2026-11-01T07:30:00Z')).toBe('2026-11-01T01:30')
    expect(toChurchDateTimeLocal('2026-11-01T08:30:00Z')).toBe('2026-11-01T01:30')
  })

  it.each(['2027-02-29T06:30', '2026-11-31T06:30', '2026-11-01T25:00', 'invalid'])('rejects invalid input: %s', (value) => {
    expect(() => churchDateTimeToIso(value)).toThrow(/valid date and time/)
  })

  it('uses Denver midnight and varying UTC offsets for schedule windows', () => {
    expect(startOfChurchDay(calendarDate('2026-11-01'))).toBe('2026-11-01T06:00:00.000Z')
    expect(startOfChurchDay(calendarDate('2026-12-01'))).toBe('2026-12-01T07:00:00.000Z')
  })
})

describe('calendar dates and month boundaries', () => {
  it.each([
    ['2026-10-31', '2026-11-01'], ['2026-11-30', '2026-12-01'],
    ['2026-12-31', '2027-01-01'], ['2027-02-28', '2027-03-01'],
    ['2028-02-28', '2028-02-29'], ['2028-02-29', '2028-03-01'],
  ])('advances %s to %s in every browser zone', (before, after) => {
    expect(calendarDateKey(addCalendarDays(calendarDate(before), 1))).toBe(after)
  })

  it('navigates months without overflowing a 31st into the following month', () => {
    expect(calendarDateKey(addCalendarMonths(calendarDate('2027-01-31'), 1))).toBe('2027-02-01')
    expect(calendarDateKey(addCalendarMonths(calendarDate('2026-12-31'), 1))).toBe('2027-01-01')
  })

  it.each([
    ['2026-11-01T05:59:59Z', '2026-10-31'], ['2026-11-01T06:00:00Z', '2026-11-01'],
    ['2026-11-01T07:30:00Z', '2026-11-01'], ['2026-11-01T08:30:00Z', '2026-11-01'],
    ['2026-11-02T06:59:59Z', '2026-11-01'], ['2026-11-02T07:00:00Z', '2026-11-02'],
  ])('identifies the Denver day for %s', (instant, dateKey) => {
    expect(getChurchDay(new Date(instant)).dateKey).toBe(dateKey)
  })
})
