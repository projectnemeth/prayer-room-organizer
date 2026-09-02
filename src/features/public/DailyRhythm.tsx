import { getTodayPrayerFocus, weeklyPrayerFocusSchedule } from "./mock-data";
import type { PrayerFocus } from "./types";

interface DailyRhythmProps {
  focus?: PrayerFocus;
}

const rhythmMoments = [
  {
    time: "Morning",
    title: "Morning Altar",
    detail: "A worship-led gathering in the Prayer Room to begin the day with Scripture and prayer.",
    participation: "Join in person when a gathering is listed on the calendar.",
  },
  {
    time: "Noon",
    title: "A noon prayer moment",
    detail: "Pause wherever you are. Read the day’s Scripture and offer a simple prayer for Jesus to be known in our church and region.",
    participation: "This is a personal or shared pause; it is not a room gathering.",
  },
  {
    time: "Evening",
    title: "Evening Altar",
    detail: "Return in worship and prayer as the day closes, making room to listen to Jesus together.",
    participation: "Join in person when a gathering is listed on the calendar.",
  },
];

export function DailyRhythm({ focus }: DailyRhythmProps) {
  const currentFocus = focus ?? getTodayPrayerFocus();
  const currentDayOfWeek = new Date().getDay();

  return (
    <main className="min-h-full bg-[#F5F1E8] px-6 py-14 text-[#1F2421] sm:px-10 lg:px-16">
      <div className="mx-auto max-w-5xl">
        <header className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#3F5F5B]">The Altar Initiative</p>
          <h1 className="mt-4 font-serif text-4xl leading-tight sm:text-5xl">A daily rhythm of prayer</h1>
          <p className="mt-5 text-lg leading-8 text-[#1F2421]/80">Morning, noon, and evening—small, shared practices that help us turn our attention to Jesus together.</p>
        </header>

        <ol className="mt-12 grid gap-5 lg:grid-cols-3">
          {rhythmMoments.map((moment, index) => (
            <li key={moment.time} className="border-t-2 border-[#B99A61] bg-white/45 p-7">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6F8580]">0{index + 1} · {moment.time}</p>
              <h2 className="mt-4 font-serif text-2xl">{moment.title}</h2>
              <p className="mt-4 leading-7 text-[#1F2421]/80">{moment.detail}</p>
              <p className="mt-5 text-sm font-medium leading-6 text-[#3F5F5B]">{moment.participation}</p>
            </li>
          ))}
        </ol>

        <section aria-labelledby="today-focus" className="mt-14 bg-[#3F5F5B] p-7 text-[#F5F1E8] sm:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#D9D3C6]">Today&apos;s prayer focus</p>
          <div className="mt-5 grid gap-8 md:grid-cols-[1fr_1.35fr]">
            <div>
              <h2 id="today-focus" className="font-serif text-3xl">{currentFocus.title}</h2>
              <p className="mt-4 leading-7 text-[#F5F1E8]/85">{currentFocus.summary}</p>
            </div>
            <blockquote className="border-l-2 border-[#B99A61] pl-5">
              <p className="font-serif text-xl leading-8">“{currentFocus.scriptureText}”</p>
              <cite className="mt-4 block text-sm font-semibold not-italic text-[#D9D3C6]">{currentFocus.scriptureReference}</cite>
            </blockquote>
          </div>
          {currentFocus.resourceUrl && currentFocus.resourceLabel ? (
            <a className="mt-7 inline-block text-sm font-semibold underline decoration-[#B99A61] decoration-2 underline-offset-4 focus:outline-none focus:ring-2 focus:ring-white" href={currentFocus.resourceUrl}>
              {currentFocus.resourceLabel}
            </a>
          ) : null}
        </section>

        <section aria-labelledby="weekly-focus-heading" className="mt-14">
          <div className="border-b border-[#D9D3C6] pb-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6F8580]">Weekly focus rhythm</p>
            <h2 id="weekly-focus-heading" className="mt-2 font-serif text-3xl">Seven days of focused intercession</h2>
            <p className="mt-3 text-[#1F2421]/80">
              Each day of the week unites our community around a specific dimension of God’s kingdom and church.
            </p>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {weeklyPrayerFocusSchedule.map((item) => {
              const isToday = item.dayOfWeek === currentDayOfWeek;
              return (
                <article
                  key={item.shortDay}
                  className={`border-t-2 p-6 transition ${
                    isToday
                      ? "border-[#B99A61] bg-[#3F5F5B]/10 shadow-sm ring-1 ring-[#3F5F5B]/20"
                      : "border-[#6F8580]/40 bg-white/45"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#3F5F5B]">
                      {item.shortDay} · {item.dayName}
                    </span>
                    {isToday ? (
                      <span className="rounded-full bg-[#B99A61] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#1F2421]">
                        Today
                      </span>
                    ) : null}
                  </div>
                  <h3 className="mt-3 font-serif text-xl font-medium text-[#1F2421]">
                    {item.focusTitle}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-[#1F2421]/80">
                    {item.summary}
                  </p>
                  <p className="mt-4 text-xs font-semibold text-[#6F8580]">
                    {item.scriptureReference}
                  </p>
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}
