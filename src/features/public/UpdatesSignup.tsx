import { useEffect, useRef, useState } from 'react'

const kitFormUid = 'f5260306b6'
const kitFormUrl = `https://lighthouse-prayer-room.kit.com/${kitFormUid}`
const kitEmbedUrl = `${kitFormUrl}/index.js`

/** Kit owns the public marketing signup and its confirmation email. */
export function UpdatesSignupForm() {
  const embedRef = useRef<HTMLDivElement>(null)
  const [embedFailed, setEmbedFailed] = useState(false)

  useEffect(() => {
    const mount = embedRef.current
    if (!mount) return

    const script = document.createElement('script')
    script.async = true
    script.dataset.uid = kitFormUid
    script.src = kitEmbedUrl
    script.onerror = () => setEmbedFailed(true)
    mount.appendChild(script)

    return () => {
      // Kit inserts its form next to the script. Clear both on route changes and
      // during React StrictMode's effect replay so the form is never duplicated.
      mount.replaceChildren()
    }
  }, [])

  return (
    <div className="border-t-2 border-altar-gold bg-altar-parchment p-6 text-altar-ink shadow-sm sm:p-8">
      <div ref={embedRef} />
      <p className="mt-4 text-xs leading-5 text-altar-ink/70">Join the ALTAR Rhythm email list for prayer resources, encouragement, and invitations. Kit will ask you to confirm your email. You can unsubscribe from its emails at any time.</p>
      {embedFailed ? <p className="mt-4 text-sm text-[#9A3412]" role="alert">The signup form could not load here. <a className="focus-ring font-semibold text-altar-teal underline decoration-altar-gold decoration-2 underline-offset-4" href={kitFormUrl}>Open the signup form in Kit</a>.</p> : null}
    </div>
  )
}

export function UpdatesSignup() {
  return (
    <main className="min-h-full bg-altar-parchment px-6 py-14 text-altar-ink sm:px-10 lg:px-16">
      <div className="mx-auto grid max-w-5xl gap-12 lg:grid-cols-[0.85fr_1.15fr]">
        <header>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-altar-teal">Stay connected</p>
          <h1 className="mt-4 font-serif text-4xl leading-tight sm:text-5xl">Stay in the Rhythm</h1>
          <p className="mt-5 text-lg leading-8 text-altar-ink/80">Receive prayer resources, encouragement, and invitations to help you cultivate a life of morning, noon, and evening prayer.</p>
        </header>
        <UpdatesSignupForm />
      </div>
    </main>
  )
}
