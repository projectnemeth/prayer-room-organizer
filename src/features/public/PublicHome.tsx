import { mockPrayerFocus, mockPublicGatherings } from "./mock-data";
import type { PrayerFocus, PublicGathering } from "./types";

interface PublicHomeProps {
  focus?: PrayerFocus;
  gatherings?: PublicGathering[];
  onNavigate?: (destination: "calendar" | "updates" | "serve" | "rhythm") => void;
}

const kindLabel = {
  morning: "Morning gathering",
  evening: "Evening gathering",
  special: "Special gathering",
};

function formatDateTime(gathering: PublicGathering) {
  const date = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date(gathering.startsAt));

  if (gathering.timeLabel) return `${date} · ${gathering.timeLabel}`;

  const time = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(gathering.startsAt));
  return `${date}, ${time}`;
}

/** Public landing content. It contains no volunteer, room-operation, or availability data. */
export function PublicHome({
  focus = mockPrayerFocus,
  gatherings = mockPublicGatherings,
  onNavigate,
}: PublicHomeProps) {
  const upcoming = gatherings.slice(0, 3);

  return (
    <main className="bg-[#F5F1E8] text-[#1F2421]">
      <section className="bg-[#3F5F5B] px-6 py-20 text-[#F5F1E8] sm:px-10 lg:px-16">
        <div className="mx-auto max-w-5xl">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#D9D3C6]">
            The Altar Initiative
          </p>
          <h1 className="mt-5 max-w-3xl font-serif text-5xl leading-[1.05] sm:text-6xl">
            A daily rhythm of prayer.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-[#F5F1E8]/90">
            Morning, noon, and evening—turning our attention to Jesus together in worship,
            Scripture, and prayer for awakening in our region.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <button
              className="rounded-sm bg-[#F5F1E8] px-5 py-3 text-sm font-semibold text-[#1F2421] transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-[#B99A61] focus:ring-offset-2 focus:ring-offset-[#3F5F5B]"
              onClick={() => onNavigate?.("calendar")}
              type="button"
            >
              View gatherings
            </button>
            <button
              className="rounded-sm border border-[#F5F1E8]/70 px-5 py-3 text-sm font-semibold text-[#F5F1E8] transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-[#B99A61] focus:ring-offset-2 focus:ring-offset-[#3F5F5B]"
              onClick={() => onNavigate?.("updates")}
              type="button"
            >
              Receive updates
            </button>
          </div>
        </div>
      </section>

      <section aria-labelledby="rhythm-heading" className="px-6 py-16 sm:px-10 lg:px-16">
        <div className="mx-auto max-w-5xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6F8580]">
            One shared rhythm
          </p>
          <h2 id="rhythm-heading" className="mt-3 font-serif text-3xl sm:text-4xl">
            Morning · Noon · Evening
          </h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {[
              ["Morning", "Gather in worship and Scripture as the day begins."],
              ["Noon", "Pause wherever you are and turn your attention to Jesus."],
              ["Evening", "Close the day in shared worship and prayer."],
            ].map(([time, description]) => (
              <article key={time} className="border-t-2 border-[#B99A61] bg-white/40 p-6">
                <h3 className="font-serif text-2xl">{time}</h3>
                <p className="mt-3 leading-7 text-[#1F2421]/80">{description}</p>
              </article>
            ))}
          </div>
          <button
            className="mt-7 text-sm font-semibold text-[#3F5F5B] underline decoration-[#B99A61] decoration-2 underline-offset-4 focus:outline-none focus:ring-2 focus:ring-[#3F5F5B]"
            onClick={() => onNavigate?.("rhythm")}
            type="button"
          >
            Explore today&apos;s prayer focus
          </button>
        </div>
      </section>

      <section aria-labelledby="focus-heading" className="bg-[#D9D3C6]/55 px-6 py-16 sm:px-10 lg:px-16">
        <div className="mx-auto grid max-w-5xl gap-8 md:grid-cols-[1fr_1.5fr] md:items-start">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#3F5F5B]">
              Today&apos;s prayer focus
            </p>
            <h2 id="focus-heading" className="mt-3 font-serif text-3xl">
              {focus.title}
            </h2>
          </div>
          <div>
            <p className="text-lg leading-8">{focus.summary}</p>
            <blockquote className="mt-6 border-l-2 border-[#B99A61] pl-5 text-[#1F2421]/80">
              <p className="font-serif text-xl leading-8">“{focus.scriptureText}”</p>
              <cite className="mt-3 block text-sm not-italic font-semibold">{focus.scriptureReference}</cite>
            </blockquote>
            {focus.resourceUrl && focus.resourceLabel ? (
              <a
                className="mt-5 inline-block text-sm font-semibold text-[#3F5F5B] underline decoration-[#B99A61] decoration-2 underline-offset-4 focus:outline-none focus:ring-2 focus:ring-[#3F5F5B]"
                href={focus.resourceUrl}
              >
                {focus.resourceLabel}
              </a>
            ) : null}
          </div>
        </div>
      </section>

      <section aria-labelledby="gatherings-heading" className="px-6 py-16 sm:px-10 lg:px-16">
        <div className="mx-auto max-w-5xl">
          <div className="flex flex-wrap items-end justify-between gap-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6F8580]">Come together</p>
              <h2 id="gatherings-heading" className="mt-3 font-serif text-3xl">Upcoming gatherings</h2>
            </div>
            <button
              className="text-sm font-semibold text-[#3F5F5B] underline decoration-[#B99A61] decoration-2 underline-offset-4 focus:outline-none focus:ring-2 focus:ring-[#3F5F5B]"
              onClick={() => onNavigate?.("calendar")}
              type="button"
            >
              See full calendar
            </button>
          </div>
          <ul className="mt-7 divide-y divide-[#6F8580]/25 border-y border-[#6F8580]/25">
            {upcoming.map((gathering) => (
              <li key={gathering.id} className="grid gap-2 py-5 md:grid-cols-[10rem_1fr_auto] md:items-center">
                <p className="text-sm font-semibold text-[#3F5F5B]">{formatDateTime(gathering)}</p>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#6F8580]">{kindLabel[gathering.kind]}</p>
                  <h3 className="mt-1 font-serif text-xl">{gathering.title}</h3>
                  <p className="mt-1 text-sm text-[#1F2421]/75">{gathering.locationLabel}</p>
                </div>
                <p className="text-sm text-[#1F2421]/75">{gathering.locationType === "hybrid" ? "In person + online" : gathering.locationType === "online" ? "Online" : "In person"}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="bg-[#1F2421] px-6 py-16 text-[#F5F1E8] sm:px-10 lg:px-16">
        <div className="mx-auto flex max-w-5xl flex-col items-start justify-between gap-6 md:flex-row md:items-center">
          <div>
            <h2 className="font-serif text-3xl">Make space for shared worship and prayer.</h2>
            <p className="mt-3 max-w-2xl leading-7 text-[#F5F1E8]/80">Your service helps sustain this rhythm. Begin with a conversation—not a shift sign-up.</p>
          </div>
          <button
            className="shrink-0 rounded-sm bg-[#B99A61] px-5 py-3 text-sm font-semibold text-[#1F2421] transition hover:bg-[#d4b77c] focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-[#1F2421]"
            onClick={() => onNavigate?.("serve")}
            type="button"
          >
            Explore serving
          </button>
        </div>
      </section>
    </main>
  );
}
