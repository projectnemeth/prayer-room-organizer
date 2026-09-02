import type { CoordinationOverviewData, CoordinationOverviewProps } from "./types";

const emptyOverview: CoordinationOverviewData = {
  periodLabel: "Current rhythm",
  upcomingGatherings: 0,
  openVolunteerSlots: 0,
  scheduledVolunteerSlots: 0,
  pendingInterests: 0,
  attentionItems: [],
};

function Metric({ label, value, detail }: { label: string; value: number; detail: string }) {
  return (
    <div className="border-t-2 border-altar-gold bg-white/55 p-5">
      <p className="text-3xl font-semibold text-altar-teal">{value}</p>
      <p className="mt-2 font-display text-xl text-altar-ink">{label}</p>
      <p className="mt-1 text-sm leading-6 text-altar-ink/70">{detail}</p>
    </div>
  );
}

/**
 * A high-level coordinator dashboard panel. Data is injected from an
 * authenticated route; it has no client, database, or authorization behavior
 * of its own.
 */
export function CoordinationOverview({
  data = emptyOverview,
  isLoading = false,
  onOpenSchedule,
  onReviewInterests,
  onPreviousPeriod,
  onNextPeriod,
  onToday,
}: CoordinationOverviewProps) {
  if (isLoading) {
    return (
      <section aria-busy="true" aria-labelledby="coordination-overview-heading" className="bg-altar-parchment p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-altar-teal">Coordinator workspace</p>
        <h2 id="coordination-overview-heading" className="mt-3 font-display text-3xl text-altar-ink">Coordination overview</h2>
        <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((index) => <div className="h-32 animate-pulse bg-altar-stone/40" key={index} />)}
        </div>
        <p className="sr-only">Loading coordination overview.</p>
      </section>
    );
  }

  const attentionItems = data.attentionItems ?? [];

  return (
    <section aria-labelledby="coordination-overview-heading" className="bg-altar-parchment p-6 sm:p-8">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-altar-teal">Coordinator workspace</p>
          <h2 id="coordination-overview-heading" className="mt-3 font-display text-3xl text-altar-ink">Coordination overview</h2>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <p className="text-sm font-semibold text-altar-sage">{data.periodLabel}</p>
            {(onPreviousPeriod || onNextPeriod) ? (
              <div className="flex items-center gap-1.5" role="group" aria-label="Date range navigation">
                {onPreviousPeriod ? (
                  <button
                    aria-label="Previous 7 days"
                    className="focus-ring rounded-sm border border-altar-teal/60 bg-white/60 px-2.5 py-1 text-xs font-semibold text-altar-teal transition-colors hover:bg-altar-stone/45"
                    onClick={onPreviousPeriod}
                    type="button"
                  >
                    ← Prev
                  </button>
                ) : null}
                {onToday ? (
                  <button
                    aria-label="Current 7 days"
                    className="focus-ring rounded-sm border border-altar-teal/60 bg-white/60 px-2.5 py-1 text-xs font-semibold text-altar-teal transition-colors hover:bg-altar-stone/45"
                    onClick={onToday}
                    type="button"
                  >
                    Today
                  </button>
                ) : null}
                {onNextPeriod ? (
                  <button
                    aria-label="Next 7 days"
                    className="focus-ring rounded-sm border border-altar-teal/60 bg-white/60 px-2.5 py-1 text-xs font-semibold text-altar-teal transition-colors hover:bg-altar-stone/45"
                    onClick={onNextPeriod}
                    type="button"
                  >
                    Next →
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
          {data.prayerFocusTitle ? <p className="mt-3 max-w-2xl text-sm leading-6 text-altar-ink/75">Current focus: <span className="font-semibold text-altar-ink">{data.prayerFocusTitle}</span></p> : null}
        </div>
        {(onOpenSchedule || onReviewInterests) ? (
          <div className="flex flex-wrap gap-3">
            {onOpenSchedule ? <button className="button-primary" onClick={onOpenSchedule} type="button">Open schedule</button> : null}
            {onReviewInterests ? <button className="focus-ring rounded-sm border border-altar-teal px-4 py-2 text-sm font-semibold text-altar-teal transition-colors hover:bg-altar-stone/45" onClick={onReviewInterests} type="button">Review interests</button> : null}
          </div>
        ) : null}
      </div>

      <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric detail="Public gatherings ahead" label="Upcoming gatherings" value={data.upcomingGatherings} />
        <Metric detail="Need an approved volunteer" label="Open volunteer slots" value={data.openVolunteerSlots} />
        <Metric detail="Already covered" label="Scheduled slots" value={data.scheduledVolunteerSlots} />
        <Metric detail="Awaiting coordinator review" label="New serving interests" value={data.pendingInterests} />
      </div>

      <section aria-labelledby="coordination-attention-heading" className="mt-8 border-t border-altar-sage/30 pt-6">
        <h3 id="coordination-attention-heading" className="font-display text-2xl text-altar-ink">Where attention is needed</h3>
        {attentionItems.length === 0 ? (
          <p className="mt-3 border-l-2 border-altar-gold bg-white/50 p-4 text-sm leading-6 text-altar-ink/75">No active gaps are flagged for this period. Continue reviewing interest responses and upcoming gatherings as the schedule changes.</p>
        ) : (
          <ul className="mt-4 grid gap-3 lg:grid-cols-2">
            {attentionItems.map((item) => (
              <li className="border border-altar-sage/25 bg-white/50 p-4" key={item.id}>
                <p className={`text-xs font-semibold uppercase tracking-[0.15em] ${item.severity === "needs-attention" ? "text-[#9A3412]" : "text-altar-sage"}`}>{item.severity === "needs-attention" ? "Needs attention" : "Keep an eye on"}</p>
                <h4 className="mt-2 font-display text-xl text-altar-ink">{item.title}</h4>
                <p className="mt-2 text-sm leading-6 text-altar-ink/75">{item.description}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </section>
  );
}
