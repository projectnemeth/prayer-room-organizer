import { useEffect, type PropsWithChildren } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { BrandLockup } from '../components/BrandLockup'

const publicNavigation = [
  { label: 'Home', to: '/' },
  { label: 'Rhythm', to: '/rhythm' },
  { label: 'Initiatives', to: '/initiatives' },
  { label: 'Resources', to: '/resources' },
]

export function AppShell({ children }: PropsWithChildren) {
  const { pathname, hash } = useLocation()

  useEffect(() => {
    if (!hash) {
      document.documentElement.scrollTop = 0
      document.body.scrollTop = 0
      return
    }
    const targetId = decodeURIComponent(hash.slice(1))
    const frame = window.requestAnimationFrame(() => {
      const target = document.getElementById(targetId)
      target?.scrollIntoView?.()
      target?.focus({ preventScroll: true })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [pathname, hash])

  return (
    <div className="min-h-screen bg-altar-parchment text-altar-ink">
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>
      <header className="border-b border-altar-stone bg-altar-parchment/95">
        <div className="mx-auto flex max-w-6xl flex-col items-stretch gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:px-8 sm:py-5">
          <BrandLockup />
          <nav aria-label="Main navigation" className="min-w-0">
            <ul className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-medium text-altar-teal sm:justify-end sm:gap-x-6">
              {publicNavigation.map((item) => (
                <li key={item.to}>
                  <NavLink className={({ isActive }) => `focus-ring rounded-sm hover:text-altar-gold ${isActive ? 'border-b-2 border-altar-gold pb-1' : ''}`} end={item.to === '/'} to={item.to}>
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </header>
      <div id="main-content" tabIndex={-1}>{children}</div>
      <footer className="border-t border-altar-stone px-5 py-8 text-center text-sm text-altar-sage sm:px-8">
        <p>A daily rhythm of worship, Scripture, and prayer.</p>
        <Link className="focus-ring mt-3 inline-block rounded-sm font-semibold text-altar-teal underline decoration-altar-gold decoration-2 underline-offset-4" to="/coordinator">Admin</Link>
      </footer>
    </div>
  )
}
