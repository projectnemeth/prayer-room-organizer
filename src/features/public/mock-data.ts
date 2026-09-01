import type { PrayerFocus, PublicGathering } from "./types";

export const mockPrayerFocus: PrayerFocus = {
  title: "Behold the beauty of the Lord",
  summary:
    "Today, turn your attention toward Jesus. Ask for fresh sight of his holiness, mercy, and nearness in our church and region.",
  scriptureReference: "Psalm 27:4",
  scriptureText:
    "One thing have I asked of the Lord, that will I seek after: that I may dwell in the house of the Lord all the days of my life, to gaze upon the beauty of the Lord.",
  resourceLabel: "Pray through Psalm 27",
  resourceUrl: "#psalm-27",
};

const altarInitiativeWeekdays = Array.from({ length: 30 }, (_, index) => {
  const day = String(index + 1).padStart(2, "0");
  const date = `2026-10-${day}`;
  const weekday = new Date(`${date}T12:00:00-06:00`).getDay();
  return weekday > 0 && weekday < 6 ? date : null;
}).filter((date): date is string => date !== null);

const sharedGatheringDetails = {
  locationType: "hybrid" as const,
  locationLabel: "Lighthouse Prayer Room",
  description:
    "Worship, thanksgiving, Scripture, and intercession as we consecrate the bookends of the day together.",
};

/**
 * Representative public data from the Altar Initiative handout. In production,
 * these records will come from the public-events projection in Supabase.
 */
export const mockPublicGatherings: PublicGathering[] = altarInitiativeWeekdays.flatMap((date) => [
  {
    id: `morning-altar-${date}`,
    kind: "morning" as const,
    title: "Morning Altar",
    startsAt: `${date}T06:30:00-06:00`,
    endsAt: `${date}T07:30:00-06:00`,
    ...sharedGatheringDetails,
  },
  {
    id: `evening-altar-${date}`,
    kind: "evening" as const,
    title: "Evening Altar",
    // A stable sort value only. The public interface preserves the handout's
    // stated "time TBD" rather than presenting this placeholder as a time.
    startsAt: `${date}T19:00:00-06:00`,
    endsAt: `${date}T20:00:00-06:00`,
    timeLabel: "Time to be announced",
    ...sharedGatheringDetails,
  },
]);
