import type { PropsWithChildren } from 'react'
import { Link } from 'react-router-dom'

const publicNavigation = [
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
          <nav aria-label="Public navigation">
            <ul className="flex items-center gap-4 text-sm font-medium text-altar-teal sm:gap-6">
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
        A daily rhythm of worship, Scripture, and prayer.
      </footer>
    </div>
  )
}
