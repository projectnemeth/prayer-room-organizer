import type { PortalAccessDeniedProps } from "./types";

/**
 * A neutral boundary state for visitors who reach a private portal without the
 * required approved-volunteer access. It deliberately exposes no account,
 * volunteer, or scheduling information.
 */
export function PortalAccessDenied({
  requestAccessLink,
  supportLink,
  signOutLink,
}: PortalAccessDeniedProps) {
  return (
    <main className="grid min-h-full place-items-center bg-altar-parchment px-6 py-14 text-altar-ink sm:px-10 lg:px-16">
      <section aria-labelledby="access-denied-title" className="w-full max-w-2xl border-t-2 border-altar-gold bg-white/50 p-7 sm:p-10">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-altar-teal">The Altar Initiative · Volunteer portal</p>
        <h1 id="access-denied-title" className="mt-4 font-display text-4xl leading-tight text-altar-teal sm:text-5xl">
          This space is for approved volunteers.
        </h1>
        <p className="mt-5 max-w-xl text-lg leading-8 text-altar-ink/80">
          The volunteer portal is invitation-only so that schedules, room details, and team communication remain private.
        </p>
        <p className="mt-5 border-l-2 border-altar-gold pl-4 text-sm leading-6 text-altar-ink/75">
          If you would like to serve, begin by sharing your interest with the Altar Initiative team. A coordinator will follow up with next steps.
        </p>

        {requestAccessLink || supportLink || signOutLink ? (
          <nav aria-label="Access options" className="mt-8 flex flex-wrap gap-3">
            {requestAccessLink ? <a className="button-primary" href={requestAccessLink.href}>{requestAccessLink.label}</a> : null}
            {supportLink ? (
              <a className="focus-ring inline-flex items-center justify-center rounded-sm border border-altar-teal px-5 py-3 text-sm font-semibold text-altar-teal transition-colors hover:bg-altar-stone/45" href={supportLink.href}>
                {supportLink.label}
              </a>
            ) : null}
            {signOutLink ? (
              <a className="focus-ring inline-flex items-center justify-center px-2 py-3 text-sm font-semibold text-altar-sage underline decoration-altar-gold decoration-2 underline-offset-4" href={signOutLink.href}>
                {signOutLink.label}
              </a>
            ) : null}
          </nav>
        ) : null}
      </section>
    </main>
  );
}
