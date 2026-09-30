import { getDailyPlaylist, getPlaylistForDay, getDailyScriptureAssignment, monthlyScriptureSchedule } from './daily-content'

describe('the monthly daily playlists', () => {
  it('has a matching Spotify destination and compact color embed for all 31 days', () => {
    const ids = new Set<string>()
    for (let day = 1; day <= 31; day++) {
      const playlist = getPlaylistForDay(day)
      const url = new URL(playlist.spotify!)
      const embed = new URL(playlist.spotifyEmbed!)
      ids.add(url.pathname)
      expect(embed.pathname).toBe(`/embed${url.pathname}`)
      expect(embed.searchParams.has('theme')).toBe(false)
      expect(playlist.appleMusic).toBeUndefined()
    }
    expect(ids.size).toBe(31)
  })

  it('repeats every month, including day 31, and rejects invalid days', () => {
    expect(getDailyPlaylist('2026-09-30')).toEqual(getDailyPlaylist('2026-10-30'))
    expect(getDailyPlaylist('2026-10-31').spotify).toContain('67TTVa7b9jlmhDrvFSV1KH')
    expect(getDailyPlaylist('2026-11-01').spotify).toBeDefined()
    for (const day of [0, 32, 1.5, NaN]) expect(getPlaylistForDay(day).spotify).toBeUndefined()
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
