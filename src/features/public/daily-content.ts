/** Fill these editorial links for days 1–30 as they are approved. */
interface PlaylistLinks {
  spotify?: string
  appleMusic?: string
}

/** Add the public meeting URL when it is ready to share. */
export const participationLinks: { liveZoom?: string } = {}

const playlistLinksByDay: Partial<Record<number, PlaylistLinks>> = {
  // 1: { spotify: 'https://open.spotify.com/playlist/...', appleMusic: 'https://music.apple.com/...' },
}

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

export function isPlaylistDate(dateKey: string) {
  return dateKey >= '2026-10-01' && dateKey <= '2026-10-30'
}

export function getDailyPlaylist(dateKey: string) {
  const links = isPlaylistDate(dateKey) ? playlistLinksByDay[Number(dateKey.slice(-2))] : undefined
  return {
    spotify: approvedLink(links?.spotify, 'open.spotify.com'),
    appleMusic: approvedLink(links?.appleMusic, 'music.apple.com'),
  }
}

export function getDailyScriptureAssignment(dayOfMonth: number) {
  return Number.isInteger(dayOfMonth) ? monthlyScriptureSchedule[dayOfMonth - 1] : undefined
}
