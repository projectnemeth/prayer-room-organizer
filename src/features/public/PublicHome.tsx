import { useEffect, useState } from "react";
import type { PrayerFocus, PublicGathering } from "./types";
import { getSupabaseBrowserClient } from "../../lib/supabase";

interface PublicHomeProps {
  focus?: PrayerFocus;
  gatherings?: PublicGathering[];
  onNavigate?: (destination: "calendar" | "updates" | "serve" | "rhythm") => void;
}

interface PublicEventRow {
  id: string; title: string; description: string | null; location_label: string | null
  participation_format: "in_person" | "online" | "hybrid" | "personal"; public_url: string | null; starts_at: string; ends_at: string
}
interface PublicFocusRow { title: string; public_summary: string | null; scripture_reference: string | null; resource_url: string | null }
function gatheringKind(title: string): PublicGathering["kind"] { const value = title.toLowerCase(); return value.includes("morning") ? "morning" : value.includes("evening") ? "evening" : "special" }
function mapGathering(row: PublicEventRow): PublicGathering { const locationType = row.participation_format === "personal" ? "in_person" : row.participation_format; return { id: row.id, title: row.title, description: row.description ?? "", locationLabel: row.location_label ?? "Location to be announced", locationType, meetingUrl: row.public_url ?? undefined, startsAt: row.starts_at, endsAt: row.ends_at, kind: gatheringKind(row.title) } }
function mapFocus(row: PublicFocusRow): PrayerFocus { return { title: row.title, summary: row.public_summary ?? "", scriptureReference: row.scripture_reference ?? "", scriptureText: "", resourceLabel: row.resource_url ? "Explore this prayer focus" : undefined, resourceUrl: row.resource_url ?? undefined } }

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
  focus: suppliedFocus,
  gatherings: suppliedGatherings,
  onNavigate,
}: PublicHomeProps) {
  const [focus, setFocus] = useState<PrayerFocus | undefined>(suppliedFocus);
  const [gatherings, setGatherings] = useState<PublicGathering[]>(suppliedGatherings ?? []);
  const [loadError, setLoadError] = useState(false);
  useEffect(() => {
    if (suppliedFocus || suppliedGatherings) return;
    let active = true;
    const load = async () => {
      try {
        const client = getSupabaseBrowserClient();
        const [{ data: eventData, error: eventError }, { data: focusData, error: focusError }] = await Promise.all([
          client.from("public_events").select("id, title, description, location_label, participation_format, public_url, starts_at, ends_at").gte("ends_at", new Date().toISOString()).order("starts_at", { ascending: true }).limit(3),
          client.from("public_prayer_focuses").select("title, public_summary, scripture_reference, resource_url").order("published_at", { ascending: false }).limit(1),
        ]);
        if (eventError || focusError) throw eventError ?? focusError;
        if (!active) return;
        setGatherings(((eventData ?? []) as PublicEventRow[]).map(mapGathering));
        const row = (focusData ?? []) as PublicFocusRow[];
        setFocus(row[0] ? mapFocus(row[0]) : undefined);
      } catch { if (active) setLoadError(true); }
    };
    void load();
    return () => { active = false; };
  }, [suppliedFocus, suppliedGatherings]);
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
              Prayer focus
            </p>
            <h2 id="focus-heading" className="mt-3 font-serif text-3xl">
              {focus?.title ?? "A shared focus will be posted soon"}
            </h2>
          </div>
          <div>
            <p className="text-lg leading-8">{focus?.summary || "The next public prayer focus is being prepared."}</p>
            {focus?.scriptureReference ? <p className="mt-6 border-l-2 border-[#B99A61] pl-5 text-sm font-semibold text-[#1F2421]/80">Scripture: {focus.scriptureReference}</p> : null}
            {focus?.resourceUrl && focus.resourceLabel ? (
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
            {upcoming.length === 0 ? <li className="py-5 text-sm leading-6 text-[#1F2421]/70">No gatherings have been published yet. Please check back soon.</li> : null}
          </ul>
          {loadError ? <p className="mt-5 text-sm text-[#1F2421]/70" role="alert">Public details could not be refreshed just now. Please try again shortly.</p> : null}
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
