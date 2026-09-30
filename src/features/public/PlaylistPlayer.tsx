import { getPlaylistForDay } from './daily-content'

export function PlaylistPlayer({ day, compact = false }: { day: number; compact?: boolean }) {
  const playlist = getPlaylistForDay(day)

  return (
    <div className={compact ? "mt-4 min-w-0" : "mt-6 min-w-0"}>
      {!compact && <p className="text-sm font-semibold text-altar-teal">Day {day} · Morning, noon &amp; evening</p>}
      <div className="mt-3 flex flex-wrap gap-3">
        {playlist.spotify && <a className="button-primary" href={playlist.spotify} rel="noopener noreferrer" target="_blank">{compact ? 'Spotify' : 'Spotify playlist'}</a>}
        {playlist.appleMusic ? <a className="button-primary" href={playlist.appleMusic} rel="noopener noreferrer" target="_blank">{compact ? 'Apple Music' : 'Apple Music playlist'}</a> : <button className="button-primary cursor-not-allowed opacity-60" disabled type="button">{compact ? 'Apple Music' : 'Apple Music playlist'}</button>}
      </div>
      {!playlist.appleMusic && <p className="mt-3 text-sm text-altar-ink/65">Apple Music playlist coming soon.</p>}
      {playlist.spotifyEmbed && <iframe key={playlist.spotifyEmbed} className="mt-5 w-full rounded-xl border-0" src={playlist.spotifyEmbed} title={`Spotify worship playlist · Day ${day}`} height="152" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" allowFullScreen loading="lazy" />}
      {playlist.appleMusicEmbed && <iframe key={playlist.appleMusicEmbed} className="mt-5 w-full rounded-xl border-0" src={playlist.appleMusicEmbed} title={`Apple Music worship playlist · Day ${day}`} height="152" allow="autoplay; encrypted-media" loading="lazy" />}
    </div>
  )
}
