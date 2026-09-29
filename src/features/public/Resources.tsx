import { Link } from 'react-router-dom'
import { UpdatesSignupForm } from './UpdatesSignup'
export function Resources() {
  return (
    <main className="bg-altar-parchment px-6 py-14 text-altar-ink sm:px-10 lg:px-16">
      <div className="mx-auto max-w-5xl">
        <header className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-altar-teal">Keep practicing</p>
          <h1 className="mt-4 font-serif text-4xl sm:text-5xl">Resources for the rhythm</h1>
          <p className="mt-5 text-lg leading-8 text-altar-ink/80">Simple ways to return to Scripture, worship, and prayer throughout the day.</p>
        </header>

        <div className="mt-12 grid gap-5 md:grid-cols-2">
          <section className="border-t-2 border-altar-gold bg-white/45 p-7">
            <h2 className="font-serif text-2xl">Pray with Scripture</h2>
            <p className="mt-4 leading-7">The weekly focuses help us pray together for people and places. The Psalms and the Lord&apos;s Prayer give words to our morning, noon, and evening moments.</p>
            <Link className="focus-ring mt-5 inline-block font-semibold text-altar-teal underline decoration-altar-gold decoration-2 underline-offset-4" to="/rhythm#praying-the-scriptures">Explore the prayer rhythm</Link>
          </section>
          <section className="border-t-2 border-altar-gold bg-white/45 p-7">
            <h2 className="font-serif text-2xl">Make space for worship</h2>
            <p className="mt-4 leading-7">A worship playlist can accompany a longer gathering or a short pause. Start with a few minutes of attentive listening, then turn to Scripture and prayer.</p>
            <p className="mt-4 text-sm text-altar-ink/70">Day-specific Apple Music and Spotify links will appear when the playlist collection is ready.</p>
          </section>
        </div>

        <section aria-labelledby="resources-updates-heading" className="mt-14 grid gap-8 border-t border-altar-stone pt-10 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <h2 className="font-serif text-3xl" id="resources-updates-heading">Carry the Rhythm Into Your Day</h2>
            <p className="mt-4 leading-7">Receive prayer resources, encouragement, and invitations to help you cultivate a life of morning, noon, and evening prayer.</p>
          </div>
          <UpdatesSignupForm />
        </section>
      </div>
    </main>
  )
}
