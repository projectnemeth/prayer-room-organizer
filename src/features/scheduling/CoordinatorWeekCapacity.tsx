import type { CapacitySlot, CoordinatorWeekCapacityProps } from "./types";

const churchTimeZone = "America/Denver";

function formatTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: churchTimeZone,
  }).format(new Date(value));
}

function getCoverageLabel(slot: CapacitySlot) {
  const assignedCount = Math.min(slot.assignedCount, slot.capacity);
  const pendingCount = Math.min(slot.pendingCount ?? 0, Math.max(slot.capacity - assignedCount, 0));
  const confirmed = `${assignedCount} of ${slot.capacity} role openings covered`;
  return pendingCount ? `${confirmed}; ${pendingCount} invitation${pendingCount === 1 ? "" : "s"} pending` : confirmed;
}

function reservedPlaces(slot: CapacitySlot) {
  return Math.min(slot.capacity, slot.assignedCount + (slot.pendingCount ?? 0));
}

/**
 * Coordinator-only overview. It intentionally renders coverage counts and
 * never accepts, requests, or displays volunteer identities.
 */
export function CoordinatorWeekCapacity({
  weekLabel,
  days,
  onSelectSlot,
  onCreateShift,
  onPreviousWeek,
  onNextWeek,
  onToday,
}: CoordinatorWeekCapacityProps) {
  const scheduledSlots = days.flatMap((day) => day.slots).filter((slot) => slot.status !== "cancelled");
  const capacity = scheduledSlots.reduce((total, slot) => total + slot.capacity, 0);
  const assigned = scheduledSlots.reduce((total, slot) => total + Math.min(slot.assignedCount, slot.capacity), 0);
  const reserved = scheduledSlots.reduce((total, slot) => total + reservedPlaces(slot), 0);
  const coveragePercent = capacity === 0 ? 0 : Math.round((assigned / capacity) * 100);

  return (
    <main className="min-h-full bg-altar-parchment px-6 py-14 text-altar-ink sm:px-10 lg:px-16">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-col gap-6 border-b border-altar-sage/30 pb-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-altar-teal">The Altar Initiative · Coordinator</p>
            <h1 className="mt-3 font-display text-4xl leading-tight text-altar-teal sm:text-5xl">Weekly coverage</h1>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <p className="text-base text-altar-ink/75">{weekLabel} · America/Denver</p>
              {(onPreviousWeek || onNextWeek) ? (
                <div className="flex items-center gap-1.5" role="group" aria-label="Week navigation">
                  {onPreviousWeek ? (
                    <button
                      aria-label="Previous week"
                      className="focus-ring rounded-sm border border-altar-teal/60 bg-white/60 px-2.5 py-1 text-xs font-semibold text-altar-teal transition-colors hover:bg-altar-stone/45"
                      onClick={onPreviousWeek}
                      type="button"
                    >
                      ← Prev
                    </button>
                  ) : null}
                  {onToday ? (
                    <button
                      aria-label="Current week"
                      className="focus-ring rounded-sm border border-altar-teal/60 bg-white/60 px-2.5 py-1 text-xs font-semibold text-altar-teal transition-colors hover:bg-altar-stone/45"
                      onClick={onToday}
                      type="button"
                    >
                      Today
                    </button>
                  ) : null}
                  {onNextWeek ? (
                    <button
                      aria-label="Next week"
                      className="focus-ring rounded-sm border border-altar-teal/60 bg-white/60 px-2.5 py-1 text-xs font-semibold text-altar-teal transition-colors hover:bg-altar-stone/45"
                      onClick={onNextWeek}
                      type="button"
                    >
                      Next →
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
          {onCreateShift ? (
            <button className="button-primary" onClick={() => onCreateShift()} type="button">
              Create a shift
            </button>
          ) : null}
        </header>

        <section aria-label="Weekly coverage summary" className="mt-8 grid gap-4 sm:grid-cols-3">
          <div className="border-t-2 border-altar-gold bg-white/50 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-altar-sage">Coverage</p>
            <p className="mt-2 font-display text-4xl text-altar-teal">{coveragePercent}%</p>
            <p className="mt-2 text-sm text-altar-ink/70">{assigned} of {capacity} role openings covered</p>
          </div>
          <div className="border-t-2 border-altar-gold bg-white/50 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-altar-sage">Open coverage</p>
            <p className="mt-2 font-display text-4xl text-altar-teal">{Math.max(capacity - reserved, 0)}</p>
            <p className="mt-2 text-sm text-altar-ink/70">{Math.max(reserved - assigned, 0)} invitation{reserved - assigned === 1 ? "" : "s"} pending</p>
          </div>
          <div className="border-t-2 border-altar-gold bg-white/50 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-altar-sage">Privacy</p>
            <p className="mt-2 font-display text-2xl text-altar-teal">Coverage only</p>
            <p className="mt-2 text-sm text-altar-ink/70">Volunteer names stay in individual assignment records.</p>
          </div>
        </section>

        <section aria-labelledby="week-grid-heading" className="mt-10">
          <div className="flex items-baseline justify-between gap-6">
            <h2 className="font-display text-2xl text-altar-teal" id="week-grid-heading">Shift role coverage by day</h2>
            <p className="text-sm text-altar-sage">Select a shift to coordinate it.</p>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-7">
            {days.map((day) => (
              <section aria-labelledby={`day-${day.id}`} className="min-w-0 bg-white/50 p-4" key={day.id}>
                <h3 className="font-display text-xl text-altar-teal" id={`day-${day.id}`}>{day.label}</h3>
                <p className="mt-1 text-xs font-medium text-altar-sage">{day.dateLabel}</p>
                {onCreateShift ? <button className="focus-ring mt-4 w-full rounded-sm border border-dashed border-altar-gold bg-altar-gold/10 px-3 py-2 text-left text-xs font-semibold text-altar-teal transition hover:bg-altar-gold/20" onClick={() => onCreateShift(day.id)} type="button">＋ Add shift</button> : null}
                {day.slots.length > 0 ? (
                  <ul className="mt-4 space-y-3">
                    {day.slots.map((slot) => {
                      const isCancelled = slot.status === "cancelled";
                      const coverage = slot.capacity === 0 ? 0 : Math.min(100, Math.round((reservedPlaces(slot) / slot.capacity) * 100));
                      return (
                        <li key={slot.id}>
                          <button
                            aria-label={`${slot.label}, ${formatTime(slot.startsAt)} to ${formatTime(slot.endsAt)}, ${getCoverageLabel(slot)}`}
                            className="focus-ring w-full rounded-sm border border-altar-sage/25 bg-altar-parchment/65 p-3 text-left transition hover:border-altar-teal disabled:cursor-default disabled:opacity-60"
                            disabled={isCancelled || !onSelectSlot}
                            onClick={() => onSelectSlot?.(slot)}
                            type="button"
                          >
                            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-altar-sage">{formatTime(slot.startsAt)}–{formatTime(slot.endsAt)}</p>
                            <p className="mt-1 text-sm font-semibold text-altar-ink">{slot.label}</p>
                            <div aria-hidden="true" className="mt-3 h-1.5 overflow-hidden bg-altar-stone">
                              <div className="h-full bg-altar-teal" style={{ width: `${coverage}%` }} />
                            </div>
                            <p className="mt-2 text-xs text-altar-ink/70">{isCancelled ? "Cancelled" : getCoverageLabel(slot)}</p>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="mt-4 border-l-2 border-altar-stone pl-3 text-sm leading-6 text-altar-ink/65">No shifts planned.</p>
                )}
              </section>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
