export type GatheringKind = "morning" | "evening" | "special";

export type GatheringLocation = "in_person" | "online" | "hybrid";

export interface PublicGathering {
  id: string;
  kind: GatheringKind;
  title: string;
  startsAt: string;
  endsAt: string;
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

export interface ServeInterestValues {
  name: string;
  email: string;
  phone: string;
  preferredContact: "email" | "phone" | "either";
  availability: string[];
  servingInterests: string[];
  note: string;
}

export interface UpdatesSignupValues {
  name: string;
  email: string;
}
