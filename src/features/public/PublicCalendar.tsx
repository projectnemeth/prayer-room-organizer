import { useMemo, useState } from "react";
import { mockPublicGatherings } from "./mock-data";
import type { GatheringKind, PublicGathering } from "./types";

interface PublicCalendarProps {
  gatherings?: PublicGathering[];
}

const kindLabels: Record<GatheringKind, string> = {
  morning: "Morning Altar",
  evening: "Evening Altar",
  special: "Special gathering",
};

function formatTime(value: string) {
  return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

function formatDay(value: string) {
  return new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric" }).format(new Date(value));
}

/** A visitor-safe gathering calendar. Its data contract deliberately excludes volunteer availability. */
export function PublicCalendar({ gatherings = mockPublicGatherings }: PublicCalendarProps) {
  const [filter, setFilter] = useState<"all" | GatheringKind>("all");
  const visibleGatherings = useMemo(
    () => gatherings.filter((gathering) => filter === "all" || gathering.kind === filter),
    [filter, gatherings],
  );

  const gatheringsByDay = visibleGatherings.reduce<Record<string, PublicGathering[]>>((days, gathering) => {
    const date = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Denver" }).format(new Date(gathering.startsAt));
    days[date] ??= [];
    days[date].push(gathering);
    return days;
  }, {});

  return (
    <main className="min-h-full bg-[#F5F1E8] px-6 py-14 text-[#1F2421] sm:px-10 lg:px-16">
      <div className="mx-auto max-w-4xl">
        <header>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#3F5F5B]">The Altar Initiative</p>
          <h1 className="mt-4 font-serif text-4xl sm:text-5xl">Gatherings</h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-[#1F2421]/80">Find public moments to gather in worship, Scripture, and prayer. More gatherings will be added as they are announced.</p>
        </header>

        <fieldset className="mt-9 flex flex-wrap gap-2" aria-label="Filter gatherings">
          <legend className="sr-only">Filter gatherings by type</legend>
          {(["all", "morning", "evening", "special"] as const).map((option) => {
            const isSelected = option === filter;
            const label = option === "all" ? "All gatherings" : kindLabels[option];
            return (
              <button
                aria-pressed={isSelected}
                className={`rounded-full border px-4 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-[#3F5F5B] ${isSelected ? "border-[#3F5F5B] bg-[#3F5F5B] text-[#F5F1E8]" : "border-[#6F8580]/45 bg-white/50 text-[#1F2421] hover:border-[#3F5F5B]"}`}
                key={option}
                onClick={() => setFilter(option)}
                type="button"
              >
                {label}
              </button>
            );
          })}
        </fieldset>

        {Object.keys(gatheringsByDay).length > 0 ? (
          <div className="mt-9 space-y-10">
            {Object.entries(gatheringsByDay).map(([date, dayGatherings]) => (
              <section aria-labelledby={`date-${date}`} key={date}>
                <h2 className="border-b border-[#6F8580]/35 pb-3 font-serif text-2xl" id={`date-${date}`}>
                  {formatDay(dayGatherings[0].startsAt)}
                </h2>
                <ul className="divide-y divide-[#6F8580]/20">
                  {dayGatherings.map((gathering) => (
                    <li className="grid gap-4 py-6 sm:grid-cols-[8rem_1fr]" key={gathering.id}>
                      <p className="text-sm font-semibold text-[#3F5F5B]">{formatTime(gathering.startsAt)}–{formatTime(gathering.endsAt)}</p>
                      <article>
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#6F8580]">{kindLabels[gathering.kind]}</p>
                        <h3 className="mt-2 font-serif text-2xl">{gathering.title}</h3>
                        <p className="mt-3 leading-7 text-[#1F2421]/80">{gathering.description}</p>
                        <p className="mt-3 text-sm font-medium text-[#3F5F5B]">{gathering.locationLabel} · {gathering.locationType === "hybrid" ? "In person and online" : gathering.locationType === "online" ? "Online" : "In person"}</p>
                        {gathering.meetingUrl ? <a className="mt-3 inline-block text-sm font-semibold underline decoration-[#B99A61] decoration-2 underline-offset-4 focus:outline-none focus:ring-2 focus:ring-[#3F5F5B]" href={gathering.meetingUrl}>Join online</a> : null}
                      </article>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        ) : (
          <p className="mt-10 border-l-2 border-[#B99A61] bg-white/40 p-5 leading-7">There are no gatherings in this view right now. Please check back soon.</p>
        )}
      </div>
    </main>
  );
}
