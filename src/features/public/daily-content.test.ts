import { isPlaylistDate } from './daily-content'

describe('the 30-day initiative playlist', () => {
  it('runs only from October 1 through October 30, 2026', () => {
    expect(isPlaylistDate('2026-09-30')).toBe(false)
    expect(isPlaylistDate('2026-10-01')).toBe(true)
    expect(isPlaylistDate('2026-10-30')).toBe(true)
    expect(isPlaylistDate('2026-10-31')).toBe(false)
    expect(isPlaylistDate('2026-11-01')).toBe(false)
  })
})
