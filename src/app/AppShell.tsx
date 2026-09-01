import { useEffect, useState, type PropsWithChildren } from 'react'
import { Link } from 'react-router-dom'
import { getSupabaseBrowserClient, hasSupabaseBrowserConfig } from '../lib/supabase'

const publicNavigation = [
  { label: 'Home', to: '/' },
  { label: 'Rhythm', to: '/rhythm' },
  { label: 'Gatherings', to: '/calendar' },
  { label: 'Receive updates', to: '/updates' },
]

export function AppShell({ children }: PropsWithChildren) {
  const [role, setRole] = useState<'coordinator' | 'admin' | null>(null)

  useEffect(() => {
    let active = true

    async function resolveNavigationRole() {
      if (!hasSupabaseBrowserConfig(import.meta.env)) return
      const client = getSupabaseBrowserClient()
      const { data: userData } = await client.auth.getUser()
      if (!userData.user) return
      const { data: profile } = await client
        .from('profiles')
        .select('role, status')
        .eq('id', userData.user.id)
        .maybeSingle()
      if (active && profile?.status === 'active' && (profile.role === 'coordinator' || profile.role === 'admin')) {
        setRole(profile.role)
      }
    }

    void resolveNavigationRole()
    return () => { active = false }
  }, [])

  const privateNavigation = role === null ? [] : [
    { label: 'Volunteer portal', to: '/portal' },
    { label: 'Coordinator', to: '/coordinator' },
    { label: 'Serving interests', to: '/coordinator/interests' },
    { label: 'Coverage', to: '/coordinator/schedule' },
    ...(role === 'admin' ? [{ label: 'People & access', to: '/coordinator/people' }] : []),
  ]

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
          <nav aria-label="Primary navigation">
            <ul className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-medium text-altar-teal sm:gap-x-6">
              {[...publicNavigation, ...privateNavigation].map((item) => (
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
