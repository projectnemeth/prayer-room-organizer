import { useState, type FormEvent } from 'react'
import type { UpdatesSignupValues } from './types'

interface UpdatesSignupProps {
  onSubscribe?: (values: UpdatesSignupValues) => Promise<void>
}

const initialValues: UpdatesSignupValues = { name: '', email: '' }

/** Shared form for the existing confirmed public updates list. */
export function UpdatesSignupForm({ onSubscribe }: UpdatesSignupProps) {
  const [values, setValues] = useState<UpdatesSignupValues>(initialValues)
  const [website, setWebsite] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string>()
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(undefined)
    setIsSubmitting(true)

    try {
      await onSubscribe?.({ ...values, website })
      setSubmitted(true)
    } catch (subscriptionError) {
      setError(subscriptionError instanceof Error ? subscriptionError.message : 'We could not subscribe you right now. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div aria-live="polite" className="border-t-2 border-altar-gold bg-altar-parchment p-8 text-altar-ink">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-altar-teal">One more step</p>
        <h2 className="mt-4 font-serif text-3xl">Please check your email.</h2>
        <p className="mt-5 leading-8 text-altar-ink/80">We sent a confirmation link for Altar Initiative updates if this address can receive it. Open it to finish subscribing. The link expires in 24 hours.</p>
        <button className="focus-ring mt-7 text-sm font-semibold text-altar-teal underline decoration-altar-gold decoration-2 underline-offset-4" onClick={() => { setValues(initialValues); setWebsite(''); setSubmitted(false) }} type="button">Use another email address</button>
      </div>
    )
  }

  return (
    <form className="border-t-2 border-altar-gold bg-altar-parchment p-6 text-altar-ink shadow-sm sm:p-8" onSubmit={submit}>
      <label className="block"><span className="text-sm font-semibold">Name <span aria-hidden="true">*</span></span><input autoComplete="name" className="mt-2 block w-full rounded-sm border border-altar-sage/55 bg-white px-3 py-2.5 focus:border-altar-teal focus:outline-none focus:ring-2 focus:ring-altar-teal/25" onChange={(event) => setValues({ ...values, name: event.target.value })} required type="text" value={values.name} /></label>
      <label className="mt-5 block"><span className="text-sm font-semibold">Email <span aria-hidden="true">*</span></span><input autoComplete="email" className="mt-2 block w-full rounded-sm border border-altar-sage/55 bg-white px-3 py-2.5 focus:border-altar-teal focus:outline-none focus:ring-2 focus:ring-altar-teal/25" onChange={(event) => setValues({ ...values, email: event.target.value })} required type="email" value={values.email} /></label>
      <label aria-hidden="true" className="hidden"><span>Website</span><input autoComplete="off" onChange={(event) => setWebsite(event.target.value)} tabIndex={-1} type="text" value={website} /></label>
      <p className="mt-6 text-xs leading-5 text-altar-ink/65">This is the existing Altar Initiative updates list. We&apos;ll ask you to confirm your email before sending updates. You can unsubscribe at any time.</p>
      {error ? <p aria-live="polite" className="mt-5 text-sm text-[#9A3412]">{error}</p> : null}
      <button className="button-primary mt-7 disabled:cursor-not-allowed disabled:opacity-70" disabled={isSubmitting || !onSubscribe} type="submit">{isSubmitting ? 'Subscribing…' : 'Receive updates'}</button>
    </form>
  )
}

export function UpdatesSignup({ onSubscribe }: UpdatesSignupProps) {
  return (
    <main className="min-h-full bg-altar-parchment px-6 py-14 text-altar-ink sm:px-10 lg:px-16">
      <div className="mx-auto grid max-w-5xl gap-12 lg:grid-cols-[0.85fr_1.15fr]">
        <header>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-altar-teal">Stay connected</p>
          <h1 className="mt-4 font-serif text-4xl leading-tight sm:text-5xl">Carry the Rhythm Into Your Day</h1>
          <p className="mt-5 text-lg leading-8 text-altar-ink/80">Sign up for Altar Initiative gathering updates and notices when new prayer resources are available.</p>
        </header>
        <UpdatesSignupForm onSubscribe={onSubscribe} />
      </div>
    </main>
  )
}
