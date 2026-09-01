import type { VolunteerPortalEmptyStateProps } from "./types";

/**
 * A private, signed-in volunteer landing state for when no upcoming assignment
 * is available to display. All navigation targets are injected by the route
 * that owns authentication and scheduling.
 */
export function VolunteerPortalEmptyState({
  volunteerName,
  periodLabel = "This week",
  availableSlotsLink,
  supportLink,
}: VolunteerPortalEmptyStateProps) {
  const greeting = volunteerName ? `Welcome, ${volunteerName}.` : "Welcome.";

  return (
    <main className="min-h-full bg-altar-parchment px-6 py-14 text-altar-ink sm:px-10 lg:px-16">
      <div className="mx-auto max-w-4xl">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-altar-teal">The Altar Initiative · Volunteer portal</p>

        <section aria-labelledby="portal-welcome" className="mt-8 border-t-2 border-altar-gold bg-white/50 p-7 sm:p-10">
          <p className="text-sm font-semibold text-altar-sage">{periodLabel}</p>
          <h1 id="portal-welcome" className="mt-3 font-display text-4xl leading-tight text-altar-teal sm:text-5xl">
            {greeting}
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-altar-ink/80">
            You do not have an upcoming prayer-room assignment at this time. Thank you for helping sustain a shared rhythm of worship and prayer.
          </p>

          <div className="mt-8 border-l-2 border-altar-gold bg-altar-stone/35 px-5 py-4">
            <h2 className="font-display text-xl text-altar-teal">Your next step</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-altar-ink/75">
              When a coordinator makes a shift available to you, it will appear here with the details you need to serve.
            </p>
          </div>

          {availableSlotsLink || supportLink ? (
            <nav aria-label="Volunteer portal actions" className="mt-8 flex flex-wrap gap-3">
              {availableSlotsLink ? (
                <a className="button-primary" href={availableSlotsLink.href}>{availableSlotsLink.label}</a>
              ) : null}
              {supportLink ? (
                <a className="focus-ring inline-flex items-center justify-center rounded-sm border border-altar-teal px-5 py-3 text-sm font-semibold text-altar-teal transition-colors hover:bg-altar-stone/45" href={supportLink.href}>
                  {supportLink.label}
                </a>
              ) : null}
            </nav>
          ) : null}
        </section>

        <p className="mt-6 max-w-2xl text-sm leading-6 text-altar-sage">
          This is a private space for approved Altar Initiative volunteers. Schedule details are visible only after you sign in.
        </p>
      </div>
    </main>
  );
}
