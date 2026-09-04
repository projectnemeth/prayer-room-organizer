import { SHIFT_ROLE_LABELS, type VolunteerAvailableSlotsProps } from "./types";

const churchTimeZone = "America/Denver";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    timeZone: churchTimeZone,
  }).format(new Date(value));
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: churchTimeZone,
  }).format(new Date(value));
}

/**
 * An approved volunteer sees safe aggregate role counts, never another
 * volunteer's identity or private schedule.
 */
export function VolunteerAvailableSlots({
  periodLabel,
  slots,
  claimingSlotId,
  cancellingSlotId,
  claimError,
  onClaimSlot,
  onCancelSlot,
}: VolunteerAvailableSlotsProps) {
  return (
    <main className="min-h-full bg-altar-parchment px-6 py-14 text-altar-ink sm:px-10 lg:px-16">
      <div className="mx-auto max-w-6xl">
        <header>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-altar-teal">The Altar Initiative · Volunteer portal</p>
          <h1 className="mt-3 font-display text-4xl leading-tight text-altar-teal sm:text-5xl">Prayer shifts</h1>
          <p className="mt-4 max-w-3xl text-lg leading-8 text-altar-ink/75">
            {periodLabel}. See where each role is most needed, then choose a shift that fits your availability. A coordinator will assign your function after you serve at a shift.
          </p>
        </header>

        {slots.length > 0 ? (
          <ul aria-label="Prayer-room shifts" className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {slots.map((slot) => {
              const isClaiming = claimingSlotId === slot.id;
              const isCancelling = cancellingSlotId === slot.id;
              const scheduled = slot.isScheduled === true;
              const cardError = claimError?.slotId === slot.id ? claimError.message : null;
              return (
                <li className="flex min-h-72 flex-col border-t-2 border-altar-gold bg-white/50 p-5" key={slot.id}>
                  <div className="flex flex-1 flex-col">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-altar-sage">
                        {formatDate(slot.startsAt)} · {formatTime(slot.startsAt)}–{formatTime(slot.endsAt)}
                      </p>
                      <h2 className="mt-2 font-display text-xl text-altar-teal">{slot.label}</h2>
                      {slot.focusTitle ? <p className="mt-2 text-sm text-altar-ink/75">Focus: {slot.focusTitle}</p> : null}
                      <p className="mt-3 text-sm font-semibold text-altar-teal">{slot.volunteerCount} volunteer{slot.volunteerCount === 1 ? "" : "s"} serving at this shift</p>
                    </div>
                    <ul className="mt-4 grid gap-x-3 gap-y-1 text-xs text-altar-ink/75 sm:grid-cols-2" aria-label="Role coverage">
                      {slot.roleCoverage.map((coverage) => <li key={coverage.role}><span className="font-semibold text-altar-teal">{SHIFT_ROLE_LABELS[coverage.role]}</span> {coverage.serving_count}/{coverage.required_count}</li>)}
                    </ul>
                    <div className="mt-5 pt-1">
                    {scheduled ? (
                      <><button className="focus-ring w-full cursor-default rounded-sm border border-altar-sage bg-altar-sage/35 px-4 py-3 font-semibold text-altar-teal" disabled type="button">You are scheduled for this shift</button><p className="mt-3 text-center text-xs font-semibold text-altar-teal" role="status">A coordinator will assign your function.</p>{onCancelSlot && slot.assignmentId ? <button className="focus-ring mt-3 w-full rounded-sm border border-altar-teal/60 bg-white/60 px-4 py-2 text-sm font-semibold text-altar-teal transition hover:bg-altar-stone/45 disabled:cursor-wait disabled:opacity-60" disabled={isCancelling} onClick={() => onCancelSlot(slot)} type="button">{isCancelling ? "Cancelling…" : "Cancel this shift"}</button> : null}</>
                    ) : onClaimSlot ? (
                      <button
                        className="button-primary w-full"
                        disabled={isClaiming}
                        onClick={() => onClaimSlot(slot)}
                        type="button"
                      >
                        {isClaiming ? "Saving…" : "Serve at this shift"}
                      </button>
                    ) : null}
                    {cardError ? <p className="mt-3 text-sm leading-5 text-[#9A3412]" role="alert">{cardError}</p> : null}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <section aria-labelledby="no-shifts" className="mt-10 border-l-2 border-altar-gold bg-white/50 p-6">
            <h2 className="font-display text-2xl text-altar-teal" id="no-shifts">No prayer shifts right now</h2>
            <p className="mt-3 max-w-2xl leading-7 text-altar-ink/75">
              Thank you for your willingness to serve. A coordinator will add new opportunities as the rhythm of the room takes shape.
            </p>
          </section>
        )}

        <p className="mt-8 text-sm leading-6 text-altar-sage">All times are shown in America/Denver. Role counts are shared to help coverage; volunteer names and schedules stay private.</p>
      </div>
    </main>
  );
}
