export type GatheringKind = "morning" | "evening" | "special";

export type GatheringLocation = "in_person" | "online" | "hybrid";

export interface PublicGathering {
  id: string;
  kind: GatheringKind;
  title: string;
  startsAt: string;
  endsAt: string;
  /** Used when a gathering is announced but its final time is not yet set. */
  timeLabel?: string;
  locationType: GatheringLocation;
  locationLabel: string;
  description: string;
  meetingUrl?: string;
}

export interface PrayerFocus {
  title: string;
  summary: string;
  scriptureReference: string;
  scriptureText: string;
  resourceLabel?: string;
  resourceUrl?: string;
}

export interface DayOfWeekFocus {
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  dayName: string;
  shortDay: string;
  focusTitle: string;
  summary: string;
  scriptureReference: string;
  scriptureText: string;
  resourceLabel?: string;
  resourceUrl?: string;
}

export interface ServeInterestValues {
  name: string;
  email: string;
  phone: string;
  availability: string[];
  servingInterests: string[];
  note: string;
}

export interface UpdatesSignupValues {
  email: string;
  website?: string;
}
