import { useState, type FormEvent } from "react";
import type { ServeInterestValues } from "./types";

interface ServeInterestFormProps {
  onSubmitInterest?: (values: ServeInterestValues) => Promise<void>;
}

const availabilityOptions = ["Mornings", "Midday", "Evenings", "Weekdays", "Weekends"];
const servingOptions = ["Prayer", "Worship", "Hospitality", "Room preparation", "I would like to learn more"];

const initialValues: ServeInterestValues = {
  name: "",
  email: "",
  phone: "",
  availability: [],
  servingInterests: [],
  note: "",
};

function toggleValue(values: string[], value: string) {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

/**
 * Public interest capture only. Integrators should send this to a protected server endpoint;
 * it intentionally has no path to volunteer scheduling or account creation.
 */
export function ServeInterestForm({ onSubmitInterest }: ServeInterestFormProps) {
  const [values, setValues] = useState<ServeInterestValues>(initialValues);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(undefined);
    setIsSubmitting(true);

    try {
      await onSubmitInterest?.(values);
      setSubmitted(true);
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "We could not send your interest right now. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <main className="min-h-full bg-[#F5F1E8] px-6 py-14 text-[#1F2421] sm:px-10 lg:px-16">
        <div aria-live="polite" className="mx-auto max-w-2xl border-t-2 border-[#B99A61] bg-white/50 p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#3F5F5B]">Thank you</p>
          <h1 className="mt-4 font-serif text-4xl">We&apos;re glad you reached out.</h1>
          <p className="mt-5 leading-8 text-[#1F2421]/80">A member of the Altar Initiative team will follow up about ways to participate. This form is the beginning of a conversation, not a commitment to a particular gathering time.</p>
          <button className="mt-7 text-sm font-semibold text-[#3F5F5B] underline decoration-[#B99A61] decoration-2 underline-offset-4 focus:outline-none focus:ring-2 focus:ring-[#3F5F5B]" onClick={() => { setValues(initialValues); setSubmitted(false); }} type="button">Submit another response</button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-full bg-[#F5F1E8] px-6 py-14 text-[#1F2421] sm:px-10 lg:px-16">
      <div className="mx-auto grid max-w-5xl gap-12 lg:grid-cols-[0.85fr_1.15fr]">
        <header>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#3F5F5B]">Serve interest</p>
          <h1 className="mt-4 font-serif text-4xl leading-tight sm:text-5xl">Explore serving with the Altar Initiative.</h1>
          <p className="mt-5 text-lg leading-8 text-[#1F2421]/80">Your service helps make space for shared worship and prayer. Tell us a little about yourself, and we&apos;ll begin a conversation.</p>
          <p className="mt-6 border-l-2 border-[#B99A61] pl-4 text-sm leading-6 text-[#1F2421]/75">Submitting this form does not sign you up for a volunteer time or create an account.</p>
        </header>

        <form className="bg-white/55 p-6 sm:p-8" onSubmit={submit}>
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="sm:col-span-2">
              <span className="text-sm font-semibold">Name <span aria-hidden="true">*</span></span>
              <input autoComplete="name" className="mt-2 block w-full rounded-sm border border-[#6F8580]/55 bg-white px-3 py-2.5 focus:border-[#3F5F5B] focus:outline-none focus:ring-2 focus:ring-[#3F5F5B]/25" onChange={(event) => setValues({ ...values, name: event.target.value })} required value={values.name} />
            </label>
            <label className="sm:col-span-2">
              <span className="text-sm font-semibold">Email <span aria-hidden="true">*</span></span>
              <input autoComplete="email" className="mt-2 block w-full rounded-sm border border-[#6F8580]/55 bg-white px-3 py-2.5 focus:border-[#3F5F5B] focus:outline-none focus:ring-2 focus:ring-[#3F5F5B]/25" onChange={(event) => setValues({ ...values, email: event.target.value })} required type="email" value={values.email} />
            </label>
            <label className="sm:col-span-2">
              <span className="text-sm font-semibold">Phone <span className="font-normal text-[#1F2421]/65">(optional — include country code, e.g. +13035550123)</span></span>
              <input autoComplete="tel" className="mt-2 block w-full rounded-sm border border-[#6F8580]/55 bg-white px-3 py-2.5 focus:border-[#3F5F5B] focus:outline-none focus:ring-2 focus:ring-[#3F5F5B]/25" onChange={(event) => setValues({ ...values, phone: event.target.value })} type="tel" value={values.phone} />
            </label>
          </div>

          <fieldset className="mt-7">
            <legend className="text-sm font-semibold">When are you generally available? <span className="font-normal text-[#1F2421]/65">(optional)</span></legend>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {availabilityOptions.map((option) => <label className="flex items-center gap-2 text-sm" key={option}><input checked={values.availability.includes(option)} onChange={() => setValues({ ...values, availability: toggleValue(values.availability, option) })} type="checkbox" value={option} />{option}</label>)}
            </div>
          </fieldset>

          <fieldset className="mt-7">
            <legend className="text-sm font-semibold">What interests you? <span className="font-normal text-[#1F2421]/65">(optional)</span></legend>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {servingOptions.map((option) => <label className="flex items-center gap-2 text-sm" key={option}><input checked={values.servingInterests.includes(option)} onChange={() => setValues({ ...values, servingInterests: toggleValue(values.servingInterests, option) })} type="checkbox" value={option} />{option}</label>)}
            </div>
          </fieldset>

          <label className="mt-7 block">
            <span className="text-sm font-semibold">Anything else you&apos;d like us to know? <span className="font-normal text-[#1F2421]/65">(optional)</span></span>
            <textarea className="mt-2 block min-h-28 w-full rounded-sm border border-[#6F8580]/55 bg-white px-3 py-2.5 focus:border-[#3F5F5B] focus:outline-none focus:ring-2 focus:ring-[#3F5F5B]/25" onChange={(event) => setValues({ ...values, note: event.target.value })} value={values.note} />
          </label>
          {error ? <p aria-live="polite" className="mt-5 text-sm text-[#9A3412]">{error}</p> : null}
          <button className="mt-7 rounded-sm bg-[#3F5F5B] px-5 py-3 text-sm font-semibold text-[#F5F1E8] transition hover:bg-[#2e4945] focus:outline-none focus:ring-2 focus:ring-[#3F5F5B] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70" disabled={isSubmitting} type="submit">{isSubmitting ? "Sending…" : "Send interest"}</button>
        </form>
      </div>
    </main>
  );
}
