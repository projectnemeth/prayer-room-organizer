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

export const mockPublicGatherings: PublicGathering[] = [
  {
    id: "morning-altar-oct-5",
    kind: "morning",
    title: "Morning Altar",
    startsAt: "2026-10-05T07:00:00-06:00",
    endsAt: "2026-10-05T08:00:00-06:00",
    locationType: "in_person",
    locationLabel: "Prayer Room · Main Campus",
    description:
      "Begin the day with Scripture, worship, and prayer for our church and region.",
  },
  {
    id: "evening-altar-oct-7",
    kind: "evening",
    title: "Evening Altar",
    startsAt: "2026-10-07T18:30:00-06:00",
    endsAt: "2026-10-07T20:00:00-06:00",
    locationType: "in_person",
    locationLabel: "Prayer Room · Main Campus",
    description:
      "Gather in worship and make space to seek the presence of Jesus together.",
  },
  {
    id: "worship-night-oct-10",
    kind: "special",
    title: "A Night of Worship & Prayer",
    startsAt: "2026-10-10T19:00:00-06:00",
    endsAt: "2026-10-10T21:00:00-06:00",
    locationType: "hybrid",
    locationLabel: "Sanctuary · Main Campus",
    description:
      "An extended evening of worship, Scripture, and prayer for awakening in our region.",
    meetingUrl: "#watch-online",
  },
  {
    id: "morning-altar-oct-12",
    kind: "morning",
    title: "Morning Altar",
    startsAt: "2026-10-12T07:00:00-06:00",
    endsAt: "2026-10-12T08:00:00-06:00",
    locationType: "in_person",
    locationLabel: "Prayer Room · Main Campus",
    description:
      "Begin the day with Scripture, worship, and prayer for our church and region.",
  },
];
