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

interface PsalmAssignments {
  morning: string
  noon: string
  evening: string
}

/** The approved 1–31 Psalm plan can be entered here when supplied. */
const psalmAssignmentsByDay: Partial<Record<number, PsalmAssignments>> = {}

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

export function getDailyPsalmAssignments(dayOfMonth: number) {
  return psalmAssignmentsByDay[dayOfMonth]
}
