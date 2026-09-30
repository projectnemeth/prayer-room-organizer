import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getSupabaseBrowserClient } from '../../lib/supabase'
import { getPrayerFocusForDayOfWeek } from './mock-data'
import { getDailyScriptureAssignment, getGatheringSeason } from './daily-content'
import { PlaylistPlayer } from './PlaylistPlayer'
import { UpdatesSignupForm } from './UpdatesSignup'
import { formatChurchDayHeading } from './church-date'
import { useChurchDay } from './useChurchDay'
import type { PrayerFocus, PublicGathering } from './types'

interface PublicHomeProps {
  focus?: PrayerFocus
  gatherings?: PublicGathering[]
}

interface PublicEventRow {
  id: string
  title: string
  description: string | null
  location_label: string | null
  participation_format: 'in_person' | 'online' | 'hybrid' | 'personal'
  public_url: string | null
  starts_at: string
  ends_at: string
}

function mapGathering(row: PublicEventRow): PublicGathering {
  const title = row.title.toLowerCase()
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? '',
    locationLabel: row.location_label ?? 'Location to be announced',
    locationType: row.participation_format === 'personal' ? 'in_person' : row.participation_format,
    meetingUrl: row.public_url ?? undefined,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    kind: title.includes('morning') ? 'morning' : title.includes('evening') ? 'evening' : 'special',
  }
}

function formatGathering(gathering: PublicGathering) {
  const date = new Date(gathering.startsAt)
  const day = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Denver', weekday: 'short', month: 'short', day: 'numeric' }).format(date)
  const time = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Denver', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' }).format(date)
  return `${day} · ${gathering.timeLabel ?? time}`
}

/** Visitor-safe landing page. Daily teaching comes from the shared Denver-local weekly schedule. */
export function PublicHome({ focus: suppliedFocus, gatherings: suppliedGatherings }: PublicHomeProps) {
  const churchDay = useChurchDay()
  const focus = suppliedFocus ?? getPrayerFocusForDayOfWeek(churchDay.dayOfWeek)
  const [gatherings, setGatherings] = useState<PublicGathering[]>(suppliedGatherings ?? [])
  const [loadError, setLoadError] = useState(false)
  const octoberVisible = churchDay.dateKey <= '2026-10-30'
  const octoberUpcoming = churchDay.dateKey < '2026-10-01'
  const gatheringSeason = getGatheringSeason(churchDay.dateKey)
  const scripture = getDailyScriptureAssignment(churchDay.dayOfMonth)

  useEffect(() => {
    if (suppliedGatherings) return
    let active = true

    const load = async () => {
      try {
        const { data, error } = await getSupabaseBrowserClient()
          .from('public_events')
          .select('id, title, description, location_label, participation_format, public_url, starts_at, ends_at')
          .gte('ends_at', new Date().toISOString())
          .order('starts_at', { ascending: true })
          .limit(3)
        if (error) throw error
        if (active) setGatherings(((data ?? []) as PublicEventRow[]).map(mapGathering))
      } catch {
        if (active) setLoadError(true)
      }
    }

    void load()
    return () => { active = false }
  }, [suppliedGatherings])

  return (
    <main className="bg-altar-parchment text-altar-ink">
      <section className="bg-altar-teal px-6 py-9 text-altar-parchment sm:px-10 sm:py-12 lg:px-16">
        <div className="mx-auto max-w-5xl">
          <h1 className="max-w-3xl font-serif text-5xl leading-[1.05] sm:text-6xl">The ALTAR Rhythm</h1>
          <p className="mt-4 max-w-2xl text-lg leading-7 text-altar-parchment/90">An ancient daily rhythm of morning, noon, and evening prayer—turning our attention to Jesus through Scripture, worship, and prayer together wherever we are.</p>
        </div>
      </section>

      <section aria-labelledby="pray-today-heading" className="px-6 py-8 sm:px-10 sm:py-10 lg:px-16">
        <div className="mx-auto max-w-5xl">
          <div className={`grid items-center gap-4 ${gatheringSeason ? 'min-[600px]:grid-cols-[minmax(0,1fr)_minmax(0,18rem)]' : ''}`}>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-altar-sage">Pray with us today</p>
              <h2 className="mt-2 font-serif text-3xl leading-tight sm:text-4xl" id="pray-today-heading">{formatChurchDayHeading(churchDay.dateKey)}</h2>
            </div>
            {gatheringSeason && (
              <div className="flex min-w-0 flex-col items-start gap-2 min-[600px]:justify-self-end">
                <a className="button-primary" href={gatheringSeason.liveZoom} rel="noopener noreferrer" target="_blank">Join Live on Zoom</a>
                <p className="text-sm leading-6 text-altar-ink/75">Mon–Fri · 6:30–7:30 AM &amp; 5–6 PM MT</p>
              </div>
            )}
          </div>
          <p className="mt-4 max-w-3xl leading-7">Wherever you are, pray with us during our shared hours: <strong>6:30–7:30 AM, 12–1 PM, and 5–6 PM Mountain Time</strong>—for a few minutes or the full hour.</p>
          {gatheringSeason && (
            <p className="mt-2 max-w-3xl leading-7">
              {gatheringSeason.invitation}{' '}
              <a className="focus-ring font-semibold text-altar-teal underline decoration-altar-gold decoration-2 underline-offset-4" href={gatheringSeason.mapsUrl} rel="noopener noreferrer" target="_blank">{gatheringSeason.locationLabel}</a>
              {' '}in {gatheringSeason.locationCity}, or online via Zoom.
            </p>
          )}

          <div className="mt-6 grid items-start gap-4 md:grid-cols-2">
            <article className="bg-altar-stone/45 p-5 sm:p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-altar-teal">{focus.category ?? focus.title}</p>
              <h3 className="mt-3 font-serif text-2xl">Today&apos;s Focus</h3>
              <p className="mt-4 leading-7"><strong>{focus.dailyTitle ?? focus.title}:</strong> {focus.summary}</p>
              <p className="mt-4 text-sm font-semibold text-altar-sage">{focus.scriptureReference}</p>
              <Link className="focus-ring mt-5 inline-block font-semibold text-altar-teal underline decoration-altar-gold decoration-2 underline-offset-4" to="/rhythm#weekly-focus">Explore the prayer focuses →</Link>
            </article>
            <article className="bg-white/55 p-5 sm:p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-altar-teal">Pray with the words of Scripture</p>
              <h3 className="mt-3 font-serif text-2xl">Today&apos;s Prayers</h3>
              <p className="mt-4 leading-7">Begin each time of prayer with the Lord&apos;s Prayer, then pray with the words of Scripture—morning, noon, and evening.</p>
              {scripture ? (
                <ul className="mt-5 space-y-2 leading-7">
                  <li><span aria-hidden="true">🌅</span> <strong>Morning:</strong> {scripture.morning}</li>
                  <li><span aria-hidden="true">☀️</span> <strong>Noon:</strong> {scripture.noon} · {scripture.proverb}</li>
                  <li><span aria-hidden="true">🌆</span> <strong>Evening:</strong> {scripture.evening}</li>
                </ul>
              ) : (
                <p className="mt-5 leading-7">Day 31 is for catching up on missed readings or reflecting on what you’ve read. No new Psalm or Proverb is assigned.</p>
              )}
              <Link className="focus-ring mt-5 inline-block font-semibold text-altar-teal underline decoration-altar-gold decoration-2 underline-offset-4" to="/rhythm#praying-the-scriptures">Explore the prayers</Link>
            </article>
            <article className="border-t-2 border-altar-gold bg-white/55 p-5 sm:p-6 md:col-span-2">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-altar-teal">Thank &amp; Praise</p>
              <h3 className="mt-3 font-serif text-2xl">Today&apos;s Worship</h3>
              <p className="mt-4 leading-7">Worship and instrumental music to accompany morning, noon, and evening prayer.</p>
              <PlaylistPlayer day={churchDay.dayOfMonth} compact />
            </article>
          </div>
        </div>
      </section>

      <section aria-labelledby="initiative-heading" className="bg-altar-stone/40 px-6 py-16 sm:px-10 lg:px-16">
        <div className="mx-auto max-w-5xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-altar-teal">Come together</p>
          <h2 className="mt-3 font-serif text-3xl" id="initiative-heading">{octoberVisible ? 'The ALTAR Initiative · October 1–30, 2026' : 'Gather in prayer'}</h2>
          {octoberVisible ? (
            <>
              <p className="mt-5 max-w-3xl leading-7">ALTAR Initiatives are shared seasons of establishing a lasting rhythm of prayer.</p>
              <p className="mt-4 max-w-3xl leading-7">{octoberUpcoming ? 'Beginning October 1, we will set aside time to seek Jesus together at the Lighthouse Prayer Room and wherever we are.' : 'This October, we are setting aside time to seek Jesus together at the Lighthouse Prayer Room and wherever we are.'}</p>
              <p className="mt-4 max-w-3xl leading-7">Practice the daily rhythm with us, and make room for at least one gathering each week—in person or online.</p>
            </>
          ) : <p className="mt-5 max-w-3xl leading-7">Continue the rhythm with others at currently published prayer gatherings.</p>}
          {gatherings.length > 0 && (
            <ul className="mt-7 divide-y divide-altar-sage/25 border-y border-altar-sage/25">
              {gatherings.map((gathering) => (
                <li className="grid gap-2 py-4 md:grid-cols-[11rem_1fr_auto] md:items-center" key={gathering.id}>
                  <p className="text-sm font-semibold text-altar-teal">{formatGathering(gathering)}</p>
                  <div><h3 className="font-serif text-xl">{gathering.title}</h3><p className="text-sm text-altar-ink/75">{gathering.locationLabel}</p></div>
                  <p className="text-sm text-altar-ink/75">{gathering.locationType === 'hybrid' ? 'In person + online' : gathering.locationType === 'online' ? 'Online' : 'In person'}</p>
                </li>
              ))}
            </ul>
          )}
          {loadError && <p className="mt-5 text-sm text-altar-ink/70" role="alert">Gatherings could not be refreshed just now. Please try again shortly.</p>}
          <Link className="button-primary mt-7" to="/initiatives">Gathering times and locations</Link>
        </div>
      </section>

      <section aria-labelledby="discover-heading" className="px-6 py-16 sm:px-10 lg:px-16">
        <div className="mx-auto max-w-5xl">
          <h2 className="font-serif text-3xl" id="discover-heading">Discover the rhythm</h2>
          <p className="mt-4 max-w-3xl text-lg leading-8">Three daily moments. A prayer focus for each day of the week. A monthly journey through the Psalms.</p>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            <div><h3 className="font-serif text-xl">Morning, noon, and evening</h3><p className="mt-3 leading-7">Pause throughout the day to turn your attention to Jesus in worship and prayer.</p></div>
            <div><h3 className="font-serif text-xl">A focus for each day</h3><p className="mt-3 leading-7">Pray with others for our workplaces, ministries, families, and the purposes of God in our communities and the world.</p></div>
            <div><h3 className="font-serif text-xl">Biblical prayers</h3><p className="mt-3 leading-7">Let Scripture give language to your prayers and return to the Lord&apos;s Prayer throughout the day.</p></div>
          </div>
          <Link className="focus-ring mt-7 inline-block font-semibold text-altar-teal underline decoration-altar-gold decoration-2 underline-offset-4" to="/rhythm">Explore the rhythm</Link>
        </div>
      </section>

      <section aria-labelledby="home-updates-heading" className="scroll-mt-6 bg-altar-ink px-6 py-16 text-altar-parchment sm:px-10 lg:px-16" id="carry-the-rhythm" tabIndex={-1}>
        <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <h2 className="font-serif text-3xl" id="home-updates-heading">Stay in the Rhythm</h2>
            <p className="mt-4 leading-7 text-altar-parchment/85">Receive prayer resources, encouragement, and invitations to help you cultivate a life of morning, noon, and evening prayer.</p>
          </div>
          <div className="text-altar-ink"><UpdatesSignupForm /></div>
        </div>
      </section>
    </main>
  )
}
