import type { PropsWithChildren } from 'react'
import { Link } from 'react-router-dom'

const publicNavigation = [
  { label: 'Home', to: '/' },
  { label: 'Rhythm', to: '/rhythm' },
  { label: 'Gatherings', to: '/calendar' },
  { label: 'Receive updates', to: '/updates' },
]

export function AppShell({ children }: PropsWithChildren) {
  return (
    <div className="min-h-screen bg-altar-parchment text-altar-ink">
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>
      <header className="border-b border-altar-stone bg-altar-parchment/95">
        <div className="mx-auto flex max-w-6xl flex-col items-start gap-3 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:px-8">
          <Link className="font-display text-xl tracking-[0.08em] text-altar-teal" to="/">
            THE ALTAR INITIATIVE
          </Link>
          <nav aria-label="Main navigation">
            <ul className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-medium text-altar-teal sm:gap-x-6">
              {publicNavigation.map((item) => (
                <li key={item.to}>
                  <Link className="focus-ring rounded-sm hover:text-altar-gold" to={item.to}>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </header>
      <div id="main-content">{children}</div>
      <footer className="border-t border-altar-stone px-5 py-8 text-center text-sm text-altar-sage sm:px-8">
        <p>A daily rhythm of worship, Scripture, and prayer.</p>
        <Link className="focus-ring mt-3 inline-block rounded-sm font-semibold text-altar-teal underline decoration-altar-gold decoration-2 underline-offset-4" to="/coordinator">Admin</Link>
      </footer>
    </div>
  )
}
