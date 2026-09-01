import { useState, type FormEvent } from 'react'

interface InvitationSignInProps {
  onRequestMagicLink: (email: string) => Promise<void>
}

/**
 * A sign-in-only entry point. It never creates a public account or volunteer
 * profile; the supplied action must request a link only for an existing user.
 */
export function InvitationSignIn({ onRequestMagicLink }: InvitationSignInProps) {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setStatus('sending')
    try {
      await onRequestMagicLink(email)
      setStatus('sent')
    } catch {
      setStatus('error')
    }
  }

  return (
    <main className="grid min-h-full place-items-center bg-altar-parchment px-6 py-14 text-altar-ink sm:px-10">
      <section aria-labelledby="sign-in-title" className="w-full max-w-xl border-t-2 border-altar-gold bg-white/50 p-7 sm:p-10">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-altar-teal">The Altar Initiative · Private access</p>
        <h1 className="mt-4 font-display text-4xl leading-tight text-altar-teal sm:text-5xl" id="sign-in-title">Sign in to the private portal</h1>
        <p className="mt-5 leading-7 text-altar-ink/80">Use the email address connected to your invitation. We’ll send a secure sign-in link—there is no public account creation or shift sign-up here.</p>

        {status === 'sent' ? (
          <div className="mt-7 border-l-2 border-altar-gold bg-altar-parchment/70 p-5" role="status">
            <h2 className="font-display text-xl text-altar-teal">Check your email</h2>
            <p className="mt-2 text-sm leading-6 text-altar-ink/75">If this address has been invited, a sign-in link is on its way. Open it in this browser to return to the private portal.</p>
          </div>
        ) : (
          <form className="mt-7 space-y-5" onSubmit={(event) => void submit(event)}>
            <div>
              <label className="text-sm font-semibold text-altar-ink" htmlFor="invitation-email">Email address</label>
              <input
                autoComplete="email"
                className="focus-ring mt-2 w-full rounded-sm border border-altar-sage/45 bg-white px-4 py-3 text-altar-ink"
                id="invitation-email"
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.org"
                required
                type="email"
                value={email}
              />
            </div>
            {status === 'error' ? <p className="border-l-2 border-altar-gold bg-altar-parchment/70 p-4 text-sm leading-6 text-altar-ink" role="alert">We couldn’t send a sign-in link right now. Please check the address or contact your Altar Initiative coordinator.</p> : null}
            <button className="button-primary" disabled={status === 'sending'} type="submit">{status === 'sending' ? 'Sending link…' : 'Email me a sign-in link'}</button>
          </form>
        )}

        <p className="mt-7 text-sm leading-6 text-altar-sage">Want to serve but haven’t been invited? <a className="focus-ring font-semibold text-altar-teal underline decoration-altar-gold decoration-2 underline-offset-4" href="/serve">Share your interest first.</a></p>
      </section>
    </main>
  )
}
