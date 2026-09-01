import { Link } from 'react-router-dom'

export function PlaceholderPage() {
  return (
    <section className="mx-auto grid min-h-[calc(100vh-11.5rem)] max-w-6xl place-items-center px-5 py-20 text-center sm:px-8">
      <div className="max-w-3xl">
        <p className="mb-6 text-xs font-semibold uppercase tracking-[0.24em] text-altar-gold">
          Morning · Noon · Evening
        </p>
        <h1 className="font-display text-5xl leading-tight text-altar-teal sm:text-7xl">
          A daily rhythm of prayer.
        </h1>
        <p className="mx-auto mt-8 max-w-xl text-lg leading-8 text-altar-sage">
          Turning our attention to Jesus together through worship, Scripture, and prayer for
          awakening.
        </p>
        <Link className="button-primary mt-10" to="/calendar">
          View gatherings
        </Link>
      </div>
    </section>
  )
}
