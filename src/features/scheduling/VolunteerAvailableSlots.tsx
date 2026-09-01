import type { AvailableVolunteerSlot, VolunteerAvailableSlotsProps } from "./types";

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

function remainingPlaces(slot: AvailableVolunteerSlot) {
  return Math.max(slot.capacity - slot.assignedCount, 0);
}

/**
 * An approved volunteer sees only shifts they can claim. No other volunteer's
 * identity or assignment state is part of this view's data contract.
 */
export function VolunteerAvailableSlots({
  periodLabel,
  slots,
  claimingSlotId,
  onClaimSlot,
}: VolunteerAvailableSlotsProps) {
  const claimableSlots = slots.filter((slot) => remainingPlaces(slot) > 0);

  return (
    <main className="min-h-full bg-altar-parchment px-6 py-14 text-altar-ink sm:px-10 lg:px-16">
      <div className="mx-auto max-w-4xl">
        <header>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-altar-teal">The Altar Initiative · Volunteer portal</p>
          <h1 className="mt-3 font-display text-4xl leading-tight text-altar-teal sm:text-5xl">Available moments to serve</h1>
          <p className="mt-4 max-w-2xl text-lg leading-8 text-altar-ink/75">
            {periodLabel}. Choose an open moment that fits your availability; your confirmation and reminders will appear in your private schedule.
          </p>
        </header>

        {claimableSlots.length > 0 ? (
          <ul aria-label="Available prayer-room shifts" className="mt-10 space-y-4">
            {claimableSlots.map((slot) => {
              const places = remainingPlaces(slot);
              const isClaiming = claimingSlotId === slot.id;
              return (
                <li className="border-l-2 border-altar-gold bg-white/50 p-5 sm:p-6" key={slot.id}>
                  <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-altar-sage">
                        {formatDate(slot.startsAt)} · {formatTime(slot.startsAt)}–{formatTime(slot.endsAt)}
                      </p>
                      <h2 className="mt-2 font-display text-2xl text-altar-teal">{slot.label}</h2>
                      {slot.focusTitle ? <p className="mt-2 text-sm text-altar-ink/75">Focus: {slot.focusTitle}</p> : null}
                      {slot.locationLabel ? <p className="mt-1 text-sm text-altar-ink/70">{slot.locationLabel}</p> : null}
                      <p className="mt-3 text-sm font-semibold text-altar-teal">{places} {places === 1 ? "place" : "places"} open</p>
                    </div>
                    {onClaimSlot ? (
                      <button
                        className="button-primary shrink-0"
                        disabled={isClaiming}
                        onClick={() => onClaimSlot(slot)}
                        type="button"
                      >
                        {isClaiming ? "Claiming…" : "Claim this time"}
                      </button>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <section aria-labelledby="no-open-shifts" className="mt-10 border-l-2 border-altar-gold bg-white/50 p-6">
            <h2 className="font-display text-2xl text-altar-teal" id="no-open-shifts">No open moments right now</h2>
            <p className="mt-3 max-w-2xl leading-7 text-altar-ink/75">
              Thank you for your willingness to serve. A coordinator will add new opportunities as the rhythm of the room takes shape.
            </p>
          </section>
        )}

        <p className="mt-8 text-sm leading-6 text-altar-sage">All times are shown in America/Denver. This view shows availability, never another volunteer’s schedule.</p>
      </div>
    </main>
  );
}
