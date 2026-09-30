import playlistLinks from './playlist-links.json'

export interface PlaylistLinks {
  spotify?: string
  spotifyEmbed?: string
  appleMusic?: string
  appleMusicEmbed?: string
}

/** Seasonal gathering access is separate from the evergreen monthly resources.
 * Add a confirmed spring season here when its dates and meeting URL are ready.
 * Ends are exclusive Denver-local dates; the October Zoom link expires November 1.
 */
const gatheringSeasons = [{
  announceFrom: '2026-09-30',
  endsBefore: '2026-11-01',
  liveZoom: 'https://altar.day/zoom-Oct26',
  invitation: 'October 1–30, Monday–Friday, join our morning and evening gatherings in person at the',
  locationLabel: 'Lighthouse Prayer Room',
  locationCity: 'Castle Rock, CO',
  mapsUrl: 'https://www.google.com/maps/search/?api=1&query=4881%20Cherokee%20Dr%2C%20Castle%20Rock%2C%20CO%2080109',
}]

export function getGatheringSeason(dateKey: string) {
  return gatheringSeasons.find((season) => dateKey >= season.announceFrom && dateKey < season.endsBefore)
}

const playlistLinksByDay: Partial<Record<number, PlaylistLinks>> = playlistLinks

interface ScriptureAssignment {
  day: number
  morning: string
  noon: string
  evening: string
  proverb: string
}

/** Repeat the approved five-Psalm cycle on calendar days 1–30 of every month. */
export const monthlyScriptureSchedule: ScriptureAssignment[] = Array.from({ length: 30 }, (_, index) => {
  const day = index + 1
  const firstPsalm = index * 5 + 1
  return {
    day,
    morning: `Psalms ${firstPsalm}–${firstPsalm + 1}`,
    noon: `Psalm ${firstPsalm + 2}`,
    evening: `Psalms ${firstPsalm + 3}–${firstPsalm + 4}`,
    proverb: `Proverbs ${day}`,
  }
})

function approvedLink(value: string | undefined, host: string) {
  if (!value) return undefined
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && url.hostname === host ? url.toString() : undefined
  } catch {
    return undefined
  }
}

/** Daily playlists repeat on calendar days 1–31 of every month. */
export function getPlaylistForDay(day: number): PlaylistLinks {
  const links = Number.isInteger(day) && day >= 1 && day <= 31 ? playlistLinksByDay[day] : undefined
  return {
    spotify: approvedLink(links?.spotify, 'open.spotify.com'),
    spotifyEmbed: approvedLink(links?.spotifyEmbed, 'open.spotify.com'),
    appleMusic: approvedLink(links?.appleMusic, 'music.apple.com'),
    appleMusicEmbed: approvedLink(links?.appleMusicEmbed, 'embed.music.apple.com'),
  }
}

export function getDailyPlaylist(dateKey: string) {
  return getPlaylistForDay(Number(dateKey.slice(-2)))
}

export function getDailyScriptureAssignment(dayOfMonth: number) {
  return Number.isInteger(dayOfMonth) ? monthlyScriptureSchedule[dayOfMonth - 1] : undefined
}
