import { useEffect, useMemo, useState } from "react";
import type { GatheringKind, PublicGathering } from "./types";
import { getSupabaseBrowserClient } from "../../lib/supabase";

interface PublicCalendarProps {
  gatherings?: PublicGathering[];
}

interface PublicEventRow {
  id: string;
  title: string;
  description: string | null;
  location_label: string | null;
  participation_format: "in_person" | "online" | "hybrid" | "personal";
  public_url: string | null;
  starts_at: string;
  ends_at: string;
}

function kindForTitle(title: string): GatheringKind {
  const normalized = title.toLowerCase();
  return normalized.includes("morning") ? "morning" : normalized.includes("evening") ? "evening" : "special";
}

function mapPublicEvent(event: PublicEventRow): PublicGathering {
  const locationType = event.participation_format === "personal" ? "in_person" : event.participation_format;
  return { id: event.id, title: event.title, description: event.description ?? "", locationLabel: event.location_label ?? "Location to be announced", locationType, meetingUrl: event.public_url ?? undefined, startsAt: event.starts_at, endsAt: event.ends_at, kind: kindForTitle(event.title) };
}

type CalendarView = "month" | "week";

const kindLabels: Record<GatheringKind, string> = {
  morning: "Morning Altar",
  evening: "Evening Altar",
  special: "Special gathering",
};

const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const churchTimeZone = "America/Denver";

function dateKey(value: Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: churchTimeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(value);
}

function gatheringDateKey(gathering: PublicGathering) {
  return dateKey(new Date(gathering.startsAt));
}

function parseDateKey(value: string) {
  return new Date(`${value}T12:00:00`);
}

function startOfWeek(value: Date) {
  const start = new Date(value);
  start.setDate(start.getDate() - start.getDay());
  return start;
}

function addDays(value: Date, count: number) {
  const next = new Date(value);
  next.setDate(next.getDate() + count);
  return next;
}

function addMonths(value: Date, count: number) {
  return new Date(value.getFullYear(), value.getMonth() + count, 1);
}

function formatCalendarHeading(value: Date) {
  return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(value);
}

function formatWeekHeading(start: Date) {
  const end = addDays(start, 6);
  const monthDay = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });
  return `${monthDay.format(start)}–${monthDay.format(end)}, ${end.getFullYear()}`;
}

function formatDayLabel(value: Date) {
  return new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric" }).format(value);
}

function eventTime(gathering: PublicGathering) {
  if (gathering.timeLabel) return "TBA";
  return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone: churchTimeZone }).format(new Date(gathering.startsAt));
}

function CalendarEvent({ gathering }: { gathering: PublicGathering }) {
  const colour = gathering.kind === "morning" ? "border-altar-gold bg-altar-gold/10" : "border-altar-teal bg-altar-teal/10";

  return (
    <article className={`min-w-0 overflow-hidden border-l-2 px-2 py-1.5 text-left ${colour}`}>
      <p className="text-[11px] font-semibold leading-4 text-altar-ink/80">{eventTime(gathering)}</p>
      <p className="text-xs font-semibold leading-4 text-altar-ink">{gathering.title}</p>
      {gathering.timeLabel ? <p className="text-[10px] leading-4 text-altar-sage">{gathering.timeLabel}</p> : null}
    </article>
  );
}

function MonthGrid({ month, gatheringsByDate }: { month: Date; gatheringsByDate: Map<string, PublicGathering[]> }) {
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1);
  const gridStart = startOfWeek(firstDay);
  const finalDay = new Date(month.getFullYear(), month.getMonth() + 1, 0);
  const gridEnd = addDays(startOfWeek(finalDay), 6);
  const cellCount = Math.round((gridEnd.getTime() - gridStart.getTime()) / 86_400_000) + 1;
  const days = Array.from({ length: cellCount }, (_, index) => addDays(gridStart, index));

  return (
    <>
      <div className="space-y-2 md:hidden">
        {days.filter((day) => day.getMonth() === month.getMonth()).map((day) => {
          const events = gatheringsByDate.get(dateKey(day)) ?? [];
          return (
            <section className="border border-altar-sage/25 bg-white/40 p-3" key={dateKey(day)}>
              <div className="flex items-baseline justify-between gap-3">
                <p className="font-semibold text-altar-teal">{formatDayLabel(day)}</p>
                <span className="text-xs font-semibold uppercase tracking-[0.12em] text-altar-sage">{events.length ? `${events.length} gathering${events.length === 1 ? "" : "s"}` : "Open day"}</span>
              </div>
              {events.length > 0 ? <div className="mt-3 space-y-2">{events.map((gathering) => <CalendarEvent gathering={gathering} key={gathering.id} />)}</div> : <p className="mt-2 text-sm text-altar-sage">No corporate gathering scheduled.</p>}
            </section>
          );
        })}
      </div>
      <div className="hidden overflow-x-auto md:block">
        <div className="min-w-[44rem]">
        <div className="grid grid-cols-7 border-y border-altar-sage/30 bg-altar-stone/20">
          {dayLabels.map((label) => <p className="px-3 py-2 text-center text-xs font-semibold uppercase tracking-[0.12em] text-altar-sage" key={label}>{label}</p>)}
        </div>
        <div className="grid grid-cols-7 border-l border-altar-sage/25">
          {days.map((day) => {
            const inCurrentMonth = day.getMonth() === month.getMonth();
            const events = gatheringsByDate.get(dateKey(day)) ?? [];
            return (
              <section className={`min-h-36 border-b border-r border-altar-sage/25 p-2 ${inCurrentMonth ? "bg-white/40" : "bg-altar-stone/15"}`} key={dateKey(day)}>
                <p className={`mb-2 text-sm font-semibold ${inCurrentMonth ? "text-altar-teal" : "text-altar-sage/70"}`}>{day.getDate()}</p>
                <div className="space-y-1.5">
                  {events.map((gathering) => <CalendarEvent gathering={gathering} key={gathering.id} />)}
                </div>
              </section>
            );
          })}
        </div>
        </div>
      </div>
    </>
  );
}

function WeekGrid({ weekStart, gatheringsByDate }: { weekStart: Date; gatheringsByDate: Map<string, PublicGathering[]> }) {
  const days = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));

  return (
    <>
      <div className="space-y-2 md:hidden">
        {days.map((day) => {
          const events = gatheringsByDate.get(dateKey(day)) ?? [];
          return <section className="border border-altar-sage/25 bg-white/40 p-3" key={dateKey(day)}><h2 className="border-b border-altar-sage/20 pb-2 text-sm font-semibold text-altar-teal">{formatDayLabel(day)}</h2>{events.length > 0 ? <div className="mt-3 space-y-2">{events.map((gathering) => <CalendarEvent gathering={gathering} key={gathering.id} />)}</div> : <p className="mt-2 text-sm leading-6 text-altar-sage">No corporate gathering scheduled.</p>}</section>;
        })}
      </div>
      <div className="hidden overflow-x-auto md:block">
        <div className="grid min-w-[52rem] grid-cols-7 border-l border-t border-altar-sage/25">
        {days.map((day) => {
          const events = gatheringsByDate.get(dateKey(day)) ?? [];
          return (
            <section className="min-h-[24rem] border-b border-r border-altar-sage/25 bg-white/40 p-3" key={dateKey(day)}>
              <h2 className="border-b border-altar-sage/20 pb-3 text-sm font-semibold text-altar-teal">{formatDayLabel(day)}</h2>
              {events.length > 0 ? (
                <div className="mt-4 space-y-3">
                  {events.map((gathering) => <CalendarEvent gathering={gathering} key={gathering.id} />)}
                </div>
              ) : <p className="mt-5 text-sm leading-6 text-altar-sage">No corporate gathering scheduled.</p>}
            </section>
          );
        })}
        </div>
      </div>
    </>
  );
}

/** A visitor-safe calendar. Its data contract deliberately excludes volunteer availability. */
export function PublicCalendar({ gatherings: suppliedGatherings }: PublicCalendarProps) {
  const [loadedGatherings, setLoadedGatherings] = useState<PublicGathering[]>(suppliedGatherings ?? []);
  const [loadError, setLoadError] = useState<string | null>(null);
  const gatherings = suppliedGatherings ?? loadedGatherings;
  const firstGathering = gatherings[0];
  const initialDate = firstGathering ? parseDateKey(gatheringDateKey(firstGathering)) : new Date();
  const [filter, setFilter] = useState<"all" | GatheringKind>("all");
  const [view, setView] = useState<CalendarView>("month");
  const [cursor, setCursor] = useState(() => new Date(initialDate.getFullYear(), initialDate.getMonth(), 1));
  useEffect(() => {
    if (suppliedGatherings) return;
    let active = true;
    const load = async () => {
      try {
        const { data, error } = await getSupabaseBrowserClient().from("public_events").select("id, title, description, location_label, participation_format, public_url, starts_at, ends_at").order("starts_at", { ascending: true });
        if (error) throw error;
        if (!active) return;
        const records = ((data ?? []) as PublicEventRow[]).map(mapPublicEvent);
        setLoadedGatherings(records);
        if (records[0]) {
          const date = parseDateKey(gatheringDateKey(records[0]));
          setCursor(new Date(date.getFullYear(), date.getMonth(), 1));
        }
      } catch {
        if (active) setLoadError("Gatherings could not be loaded right now. Please try again shortly.");
      }
    };
    void load();
    return () => { active = false; };
  }, [suppliedGatherings]);
  const visibleGatherings = useMemo(
    () => gatherings.filter((gathering) => filter === "all" || gathering.kind === filter),
    [filter, gatherings],
  );
  const gatheringsByDate = useMemo(() => {
    const records = new Map<string, PublicGathering[]>();
    visibleGatherings.forEach((gathering) => {
      const key = gatheringDateKey(gathering);
      records.set(key, [...(records.get(key) ?? []), gathering]);
    });
    return records;
  }, [visibleGatherings]);
  const weekStart = startOfWeek(cursor);

  const previous = () => setCursor((current) => view === "month" ? addMonths(current, -1) : addDays(current, -7));
  const next = () => setCursor((current) => view === "month" ? addMonths(current, 1) : addDays(current, 7));

  return (
    <main className="min-h-full bg-altar-parchment px-4 py-10 text-altar-ink sm:px-10 sm:py-14 lg:px-16">
      <div className="mx-auto max-w-6xl">
        <header>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-altar-teal">The Altar Initiative</p>
          <h1 className="mt-4 font-display text-4xl text-altar-teal sm:text-5xl">Gatherings</h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-altar-ink/80">Gather for worship, Scripture, and prayer in the Lighthouse Prayer Room and online when indicated.</p>
        </header>
        {loadError ? <p className="mt-6 border-l-2 border-altar-gold bg-white/50 p-4 text-sm" role="alert">{loadError}</p> : null}

        <div className="mt-9 flex flex-col gap-5 border-y border-altar-sage/30 py-5 lg:flex-row lg:items-center lg:justify-between">
          <fieldset className="flex flex-wrap gap-2" aria-label="Filter gatherings">
            <legend className="sr-only">Filter gatherings by type</legend>
            {(["all", "morning", "evening"] as const).map((option) => {
              const isSelected = option === filter;
              const label = option === "all" ? "All gatherings" : kindLabels[option];
              return (
                <button
                  aria-pressed={isSelected}
                  className={`focus-ring rounded-full border px-4 py-2 text-sm font-semibold transition ${isSelected ? "border-altar-teal bg-altar-teal text-altar-parchment" : "border-altar-sage/45 bg-white/50 text-altar-ink hover:border-altar-teal"}`}
                  key={option}
                  onClick={() => setFilter(option)}
                  type="button"
                >
                  {label}
                </button>
              );
            })}
          </fieldset>

          <div className="flex w-full rounded-sm border border-altar-teal/50 bg-white/40 p-1 sm:w-fit" role="group" aria-label="Calendar view">
            {(["month", "week"] as const).map((option) => (
              <button
                aria-pressed={view === option}
                className={`focus-ring flex-1 rounded-sm px-3 py-2 text-sm font-semibold sm:flex-none ${view === option ? "bg-altar-teal text-altar-parchment" : "text-altar-teal"}`}
                key={option}
                onClick={() => setView(option)}
                type="button"
              >
                {option === "month" ? "Month" : "Week"}
              </button>
            ))}
          </div>
        </div>

        <section className="mt-7" aria-labelledby="calendar-period">
          <div className="mb-5 grid grid-cols-[auto_1fr_auto] items-center gap-2 sm:flex sm:justify-between sm:gap-4">
            <button aria-label={`Previous ${view}`} className="focus-ring rounded-sm border border-altar-teal px-2 py-2 text-sm font-semibold text-altar-teal hover:bg-white/60 sm:px-3" onClick={previous} type="button"><span className="sm:hidden">←</span><span className="hidden sm:inline">← Previous</span></button>
            <h2 className="text-center font-display text-xl text-altar-teal sm:text-3xl" id="calendar-period">{view === "month" ? formatCalendarHeading(cursor) : formatWeekHeading(weekStart)}</h2>
            <button aria-label={`Next ${view}`} className="focus-ring rounded-sm border border-altar-teal px-2 py-2 text-sm font-semibold text-altar-teal hover:bg-white/60 sm:px-3" onClick={next} type="button"><span className="sm:hidden">→</span><span className="hidden sm:inline">Next →</span></button>
          </div>

          {view === "month" ? <MonthGrid gatheringsByDate={gatheringsByDate} month={cursor} /> : <WeekGrid gatheringsByDate={gatheringsByDate} weekStart={weekStart} />}
        </section>

        {gatherings.length === 0 && !loadError ? <aside className="mt-8 border-l-2 border-altar-gold bg-white/45 p-5 text-sm leading-6 text-altar-ink/75">No gatherings have been published yet. Please check back soon.</aside> : null}
      </div>
    </main>
  );
}
