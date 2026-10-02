import { useEffect } from 'react'
import { getSupabaseBrowserClient } from '../../lib/supabase'

/** Auth may fall back to the Site URL, including the public homepage. */
export function AuthCallback({ onComplete }: { onComplete: (signedIn: boolean) => void }) {
  useEffect(() => {
    let active = true
    async function finish() {
      try {
        const { data, error } = await getSupabaseBrowserClient().auth.getSession()
        if (active) onComplete(!error && Boolean(data.session))
      } catch {
        if (active) onComplete(false)
      }
    }
    void finish()
    return () => { active = false }
  }, [onComplete])

  return <main className="grid min-h-full place-items-center bg-altar-parchment px-6 py-14 text-altar-ink"><p role="status">Completing your sign-in…</p></main>
}
