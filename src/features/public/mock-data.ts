import type { DayOfWeekFocus, PrayerFocus, PublicGathering } from "./types";

export const weeklyPrayerFocusSchedule: DayOfWeekFocus[] = [
  {
    dayOfWeek: 1,
    dayName: "Monday",
    shortDay: "MON",
    focusTitle: "Marketplace",
    summary:
      "Pray for believers in business, trades, education, healthcare, civic leadership, and every workplace—that integrity, excellence, and the fragrance of Christ would transform our city’s marketplace.",
    scriptureReference: "Colossians 3:23-24",
    scriptureText:
      "Whatever you do, work heartily, as for the Lord and not for men, knowing that from the Lord you will receive the inheritance as your reward. You are serving the Lord Christ.",
    resourceLabel: "Pray for your workplace",
    resourceUrl: "#marketplace",
  },
  {
    dayOfWeek: 2,
    dayName: "Tuesday",
    shortDay: "TUE",
    focusTitle: "Ministries",
    summary:
      "Pray for local churches, outreach ministries, pastors, and leaders serving the vulnerable across our region—for supernatural endurance, unity, and fresh spiritual power.",
    scriptureReference: "2 Thessalonians 1:11-12",
    scriptureText:
      "To this end we always pray for you, that our God may make you worthy of his calling and may fulfill every resolve for good and every work of faith by his power.",
    resourceLabel: "Pray for church ministries",
    resourceUrl: "#ministries",
  },
  {
    dayOfWeek: 3,
    dayName: "Wednesday",
    shortDay: "WED",
    focusTitle: "Awakening (Next Gen)",
    summary:
      "Intercede for children, youth, college students, and emerging generations—for an awakening to the holiness and love of Jesus, spiritual protection, and bold faith.",
    scriptureReference: "Psalm 78:6-7",
    scriptureText:
      "That the next generation might know them, the children yet unborn, and arise and tell them to their children, so that they should set their hope in God.",
    resourceLabel: "Pray for the Next Generation",
    resourceUrl: "#awakening",
  },
  {
    dayOfWeek: 4,
    dayName: "Thursday",
    shortDay: "THU",
    focusTitle: "Family",
    summary:
      "Lift up families, marriages, single parents, children, and households. Pray for healing, reconciliation, deep generational faith, and homes filled with the peace of Christ.",
    scriptureReference: "Joshua 24:15",
    scriptureText:
      "As for me and my house, we will serve the Lord.",
    resourceLabel: "Pray for families and households",
    resourceUrl: "#family",
  },
  {
    dayOfWeek: 5,
    dayName: "Friday",
    shortDay: "FRI",
    focusTitle: "Fullness (Israel & the Nations)",
    summary:
      "Pray for the peace of Jerusalem, the salvation of Israel, unreached people groups, and missionaries around the globe—that all nations would behold His glory.",
    scriptureReference: "Isaiah 62:6-7",
    scriptureText:
      "On your walls, O Jerusalem, I have set watchmen; all the day and all the night they shall never be silent. You who put the Lord in remembrance, take no rest, and give him no rest until he establishes Jerusalem.",
    resourceLabel: "Pray for Israel and the nations",
    resourceUrl: "#fullness",
  },
  {
    dayOfWeek: 6,
    dayName: "Saturday",
    shortDay: "SAT",
    focusTitle: "Sabbath (delighting in God as Creator, Sustainer, and Coming King)",
    summary:
      "Enter into rest and adoration, delighting in God as Creator, Sustainer, and Coming King. Set aside striving and recalibrate in His abiding presence and sovereign goodness.",
    scriptureReference: "Psalm 103:1-2",
    scriptureText:
      "Bless the Lord, O my soul, and all that is within me, bless his holy name! Bless the Lord, O my soul, and forget not all his benefits.",
    resourceLabel: "Sabbath reflection and adoration",
    resourceUrl: "#sabbath",
  },
  {
    dayOfWeek: 0,
    dayName: "Sunday",
    shortDay: "SUN",
    focusTitle: "Sanctuary (blessing the Gathered Church)",
    summary:
      "Bless the gathered Church on the Lord’s Day. Pray for pastors, teachers, worshipers, and seekers assembling in sanctuaries across our region—for conviction, joy, and the manifest presence of God.",
    scriptureReference: "Psalm 134:1-2",
    scriptureText:
      "Come, bless the Lord, all you servants of the Lord, who stand by night in the house of the Lord! Lift up your hands to the holy place and bless the Lord!",
    resourceLabel: "Blessing the gathered Church",
    resourceUrl: "#sanctuary",
  },
];

export function getPrayerFocusForDayOfWeek(dayOfWeek: number): PrayerFocus {
  const normalizedDay = ((dayOfWeek % 7) + 7) % 7;
  const match = weeklyPrayerFocusSchedule.find((item) => item.dayOfWeek === normalizedDay);
  if (!match) {
    return {
      title: weeklyPrayerFocusSchedule[0].focusTitle,
      summary: weeklyPrayerFocusSchedule[0].summary,
      scriptureReference: weeklyPrayerFocusSchedule[0].scriptureReference,
      scriptureText: weeklyPrayerFocusSchedule[0].scriptureText,
      resourceLabel: weeklyPrayerFocusSchedule[0].resourceLabel,
      resourceUrl: weeklyPrayerFocusSchedule[0].resourceUrl,
    };
  }
  return {
    title: match.focusTitle,
    summary: match.summary,
    scriptureReference: match.scriptureReference,
    scriptureText: match.scriptureText,
    resourceLabel: match.resourceLabel,
    resourceUrl: match.resourceUrl,
  };
}

export function getTodayPrayerFocus(date = new Date()): PrayerFocus {
  return getPrayerFocusForDayOfWeek(date.getDay());
}

export const mockPrayerFocus: PrayerFocus = getPrayerFocusForDayOfWeek(1);

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
