import { Link } from 'react-router-dom'
import { useChurchDay } from './useChurchDay'
import { UpdatesSignupForm } from './UpdatesSignup'
import type { UpdatesSignupValues } from './types'

interface InitiativesProps {
  onSubscribe?: (values: UpdatesSignupValues) => Promise<void>
}

export function Initiatives({ onSubscribe }: InitiativesProps) {
  const { dateKey } = useChurchDay()
  const upcoming = dateKey < '2026-10-01'
  const active = dateKey >= '2026-10-01' && dateKey <= '2026-10-30'

  return (
    <main className="bg-altar-parchment text-altar-ink">
      <section className="bg-altar-teal px-6 py-16 text-altar-parchment sm:px-10 lg:px-16">
        <div className="mx-auto max-w-5xl">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-altar-stone">Gather in a shared season</p>
          <h1 className="mt-4 font-serif text-4xl sm:text-5xl">ALTAR Initiatives</h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-altar-parchment/90">ALTAR Initiatives are shared seasons of establishing a lasting rhythm of prayer. Pray morning, noon, and evening wherever you are, and gather with others when you can.</p>
        </div>
      </section>

      {(upcoming || active) && (
        <section aria-labelledby="october-heading" className="px-6 py-14 sm:px-10 lg:px-16">
          <div className="mx-auto max-w-5xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-altar-sage">{upcoming ? 'Upcoming initiative' : 'Current initiative'}</p>
            <h2 className="mt-3 font-serif text-3xl" id="october-heading">The ALTAR Initiative · October 1–30, 2026</h2>
            <p className="mt-5 max-w-3xl leading-7">{upcoming ? 'Beginning October 1, we will set aside time to seek Jesus together through morning and evening gatherings at the Lighthouse Prayer Room and noon prayer wherever we are.' : 'This October, we are setting aside time to seek Jesus together through morning and evening gatherings at the Lighthouse Prayer Room and noon prayer wherever we are.'}</p>
            <p className="mt-4 max-w-3xl leading-7">Practice the daily rhythm with us, and make room for at least one gathering each week—in person or online when available. See the published calendar for exact dates, locations, and participation details.</p>
            <Link className="button-primary mt-7" to="/calendar">Gathering times and locations</Link>
          </div>
        </section>
      )}

      {!upcoming && !active && (
        <section className="px-6 py-14 sm:px-10 lg:px-16">
          <div className="mx-auto max-w-5xl">
            <h2 className="font-serif text-3xl">Gather with us</h2>
            <p className="mt-4 max-w-3xl leading-7">See the calendar for currently published prayer gatherings and ways to participate.</p>
            <Link className="button-primary mt-7" to="/calendar">View gatherings</Link>
          </div>
        </section>
      )}

      <section className="border-t border-altar-stone px-6 py-14 sm:px-10 lg:px-16">
        <div className="mx-auto max-w-5xl">
          <h2 className="font-serif text-3xl">Make room for shared prayer</h2>
          <p className="mt-4 max-w-3xl leading-7">Interested in helping sustain the gatherings? Tell our coordinators how you might serve. They&apos;ll follow up before any volunteer access is granted.</p>
          <Link className="focus-ring mt-5 inline-block font-semibold text-altar-teal underline decoration-altar-gold decoration-2 underline-offset-4" to="/serve">Explore serving</Link>
        </div>
      </section>

      <section aria-labelledby="updates-heading" className="bg-altar-stone/40 px-6 py-14 sm:px-10 lg:px-16">
        <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <h2 className="font-serif text-3xl" id="updates-heading">Carry the Rhythm Into Your Day</h2>
            <p className="mt-4 leading-7">Sign up for Altar Initiative gathering updates and notices when new prayer resources are available.</p>
          </div>
          <UpdatesSignupForm onSubscribe={onSubscribe} />
        </div>
      </section>
    </main>
  )
}
