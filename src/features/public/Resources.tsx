import { UpdatesSignupForm } from './UpdatesSignup'

const courseUrl = 'https://altar.day/CPC'

const eyebrowClass = 'text-xs font-semibold uppercase tracking-[0.22em] text-altar-teal'
const sectionClass = 'grid gap-6 border-t border-altar-stone py-12 md:grid-cols-[9rem_1fr] md:gap-10 md:py-16'

export function Resources() {
  return (
    <main className="bg-altar-parchment text-altar-ink">
      <header className="bg-altar-teal px-6 py-16 text-altar-parchment sm:px-10 sm:py-20 lg:px-16">
        <div className="mx-auto max-w-5xl">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-altar-parchment/80">Keep practicing</p>
          <h1 className="mt-4 max-w-3xl font-serif text-4xl leading-tight sm:text-5xl">Resources for the rhythm</h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-altar-parchment/90">Learn, reflect, worship, and carry the rhythm of prayer into everyday life.</p>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-6 sm:px-10 lg:px-0">
        <section aria-labelledby="course-heading" className={sectionClass}>
          <p aria-hidden="true" className="font-serif text-4xl text-altar-gold">01</p>
          <div className="max-w-3xl">
            <p className={eyebrowClass}>Grow in the Rhythm</p>
            <h2 className="mt-3 font-serif text-3xl sm:text-4xl" id="course-heading">Corporate Prayer Course</h2>
            <p className="mt-5 max-w-2xl leading-8">Explore the biblical vision and practical rhythms of corporate prayer. Grow in confidence as you learn why we gather, how Scripture shapes our prayer, and how we pray together.</p>
            <a className="button-primary mt-7" href={courseUrl} rel="noopener noreferrer" target="_blank">Get the Course Now <span aria-hidden="true" className="ml-2">↗</span></a>
          </div>
        </section>

        <section aria-labelledby="blog-heading" className={sectionClass}>
          <p aria-hidden="true" className="font-serif text-4xl text-altar-gold">02</p>
          <div className="max-w-3xl">
            <p className={eyebrowClass}>Go Deeper in the Rhythm</p>
            <h2 className="mt-3 font-serif text-3xl sm:text-4xl" id="blog-heading">Blog: Meditations &amp; Reflections</h2>
            <p className="mt-5 max-w-2xl leading-8">Read meditations, biblical reflections, and practical teaching designed to deepen a life of worship and prayer. New articles will help you linger in Scripture and continue growing in the rhythm.</p>
            <p className="mt-5 text-sm font-medium text-altar-teal">Blog link coming soon.</p>
          </div>
        </section>

        <section aria-labelledby="playlists-heading" className={sectionClass}>
          <p aria-hidden="true" className="font-serif text-4xl text-altar-gold">03</p>
          <div className="max-w-3xl">
            <p className={eyebrowClass}>Sing Your Prayers</p>
            <h2 className="mt-3 font-serif text-3xl sm:text-4xl" id="playlists-heading">Worship Playlists</h2>
            <p className="mt-5 max-w-2xl leading-8">Let worship accompany your morning, noon, and evening prayer. Day-specific playlists combine sung prayer, Scripture, worship, and instrumental space to help turn your attention to Jesus throughout the day.</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <button className="button-primary cursor-not-allowed opacity-60" disabled type="button">Spotify Playlist</button>
              <button className="button-primary cursor-not-allowed opacity-60" disabled type="button">Apple Music Playlist</button>
            </div>
            <p className="mt-3 text-sm text-altar-ink/70">Playlist links are coming soon.</p>
          </div>
        </section>

        <section aria-labelledby="wristbands-heading" className={sectionClass}>
          <p aria-hidden="true" className="font-serif text-4xl text-altar-gold">04</p>
          <div className="max-w-3xl">
            <p className={eyebrowClass}>ALTAR Merch</p>
            <h2 className="mt-3 font-serif text-3xl sm:text-4xl" id="wristbands-heading">Carry the Rhythm With You</h2>
            <p className="mt-5 max-w-2xl leading-8">Carry a tangible reminder of the rhythm into your everyday life. ALTAR wristbands are designed to keep prayer close at hand—with a built-in NFC chip that connects you directly to the ALTAR Rhythm&apos;s daily focus, prayers, and worship playlists.</p>
            <p className="mt-6 border-l-2 border-altar-gold pl-4 text-sm leading-6 text-altar-ink/80">ALTAR wristbands are currently available for local pay and pickup only at The Rock Church. Online purchase is coming soon.</p>
          </div>
        </section>
      </div>

      <section aria-labelledby="resources-updates-heading" className="bg-altar-ink px-6 py-16 text-altar-parchment sm:px-10 lg:px-16">
        <div className="mx-auto grid max-w-5xl gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-14">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-altar-gold">Stay connected</p>
            <h2 className="mt-3 font-serif text-3xl sm:text-4xl" id="resources-updates-heading">Stay in the Rhythm</h2>
            <p className="mt-5 max-w-lg leading-8 text-altar-parchment/85">Receive prayer resources, encouragement, and invitations to help you cultivate a life of morning, noon, and evening prayer. Join the email list and stay connected to what&apos;s happening across the ALTAR Rhythm.</p>
            <a className="focus-ring mt-7 inline-flex rounded-sm bg-altar-parchment px-5 py-3 text-sm font-semibold text-altar-ink hover:bg-white" href="#resources-signup">Join the Rhythm <span aria-hidden="true" className="ml-2">↓</span></a>
          </div>
          <div className="scroll-mt-8 text-altar-ink" id="resources-signup" tabIndex={-1}><UpdatesSignupForm /></div>
        </div>
      </section>
    </main>
  )
}
