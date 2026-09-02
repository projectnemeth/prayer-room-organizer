import { useState, type FormEvent } from "react";
import type { UpdatesSignupValues } from "./types";

interface UpdatesSignupProps {
  onSubscribe?: (values: UpdatesSignupValues) => Promise<void>;
}

const initialValues: UpdatesSignupValues = { email: "" };

/** Public communications consent form. Persisting consent, opt-outs, and any SMS delivery happens outside this component. */
export function UpdatesSignup({ onSubscribe }: UpdatesSignupProps) {
  const [values, setValues] = useState<UpdatesSignupValues>(initialValues);
  const [website, setWebsite] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(undefined);
    setIsSubmitting(true);

    try {
      await onSubscribe?.({ ...values, website });
      setSubmitted(true);
    } catch (subscriptionError) {
      setError(subscriptionError instanceof Error ? subscriptionError.message : "We could not subscribe you right now. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (submitted) {
    return <main className="min-h-full bg-[#F5F1E8] px-6 py-14 text-[#1F2421] sm:px-10 lg:px-16"><div aria-live="polite" className="mx-auto max-w-2xl border-t-2 border-[#B99A61] bg-white/50 p-8"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#3F5F5B]">One more step</p><h1 className="mt-4 font-serif text-4xl">Please check your email.</h1><p className="mt-5 leading-8 text-[#1F2421]/80">We sent a confirmation link if this address can receive Altar Initiative updates. Open it to finish subscribing. The link expires in 24 hours.</p><button className="mt-7 text-sm font-semibold text-[#3F5F5B] underline decoration-[#B99A61] decoration-2 underline-offset-4 focus:outline-none focus:ring-2 focus:ring-[#3F5F5B]" onClick={() => { setValues(initialValues); setWebsite(""); setSubmitted(false); }} type="button">Use another email address</button></div></main>;
  }

  return (
    <main className="min-h-full bg-[#F5F1E8] px-6 py-14 text-[#1F2421] sm:px-10 lg:px-16">
      <div className="mx-auto grid max-w-5xl gap-12 lg:grid-cols-[0.85fr_1.15fr]">
        <header>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#3F5F5B]">Stay connected</p>
          <h1 className="mt-4 font-serif text-4xl leading-tight sm:text-5xl">Receive gathering updates and daily prayer focuses.</h1>
          <p className="mt-5 text-lg leading-8 text-[#1F2421]/80">Receive a simple email when public Altar Initiative gatherings and resources are announced.</p>
        </header>
        <form className="bg-white/55 p-6 sm:p-8" onSubmit={submit}>
          <label className="block"><span className="text-sm font-semibold">Email <span aria-hidden="true">*</span></span><input autoComplete="email" className="mt-2 block w-full rounded-sm border border-[#6F8580]/55 bg-white px-3 py-2.5 focus:border-[#3F5F5B] focus:outline-none focus:ring-2 focus:ring-[#3F5F5B]/25" onChange={(event) => setValues({ ...values, email: event.target.value })} required type="email" value={values.email} /></label>
          <label aria-hidden="true" className="hidden"><span>Website</span><input autoComplete="off" onChange={(event) => setWebsite(event.target.value)} tabIndex={-1} type="text" value={website} /></label>
          <p className="mt-6 text-xs leading-5 text-[#1F2421]/65">We&apos;ll ask you to confirm this email before sending updates. You can unsubscribe at any time. We will use your information only for Altar Initiative communications.</p>
          {error ? <p aria-live="polite" className="mt-5 text-sm text-[#9A3412]">{error}</p> : null}
          <button className="mt-7 rounded-sm bg-[#3F5F5B] px-5 py-3 text-sm font-semibold text-[#F5F1E8] transition hover:bg-[#2e4945] focus:outline-none focus:ring-2 focus:ring-[#3F5F5B] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70" disabled={isSubmitting} type="submit">{isSubmitting ? "Subscribing…" : "Subscribe to updates"}</button>
        </form>
      </div>
    </main>
  );
}
