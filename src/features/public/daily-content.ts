import playlistLinks from './playlist-links.json'

export interface PlaylistLinks {
  spotify?: string
  spotifyEmbed?: string
  appleMusic?: string
  appleMusicEmbed?: string
}

/** Add the public meeting URL when it is ready to share. */
export const participationLinks: { liveZoom?: string } = {}

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
