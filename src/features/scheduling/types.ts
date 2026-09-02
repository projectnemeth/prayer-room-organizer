/**
 * Coordinator-assigned roles a volunteer fills within a single prayer-set shift.
 * One person may hold multiple roles in the same assignment.
 */
export type ShiftRole =
  | "prayer_leader"
  | "worship_leader"
  | "worship_team_member"
  | "host"
  | "tech_director";

export const SHIFT_ROLE_LABELS: Record<ShiftRole, string> = {
  prayer_leader: "Prayer Leader",
  worship_leader: "Worship Leader",
  worship_team_member: "Worship Team Member",
  host: "Host",
  tech_director: "Tech Director",
};

/** All five roles in a consistent display order. */
export const SHIFT_ROLE_OPTIONS: ShiftRole[] = [
  "prayer_leader",
  "worship_leader",
  "worship_team_member",
  "host",
  "tech_director",
];

/**
 * Deliberately contains counts rather than people. Coordinator coverage can be
 * understood at a glance without turning the schedule into a volunteer roster.
 */
export interface CapacitySlot {
  id: string;
  startsAt: string;
  endsAt: string;
  label: string;
  capacity: number;
  assignedCount: number;
  status?: "scheduled" | "cancelled" | "completed";
}

export interface CapacityDay {
  id: string;
  label: string;
  dateLabel: string;
  slots: CapacitySlot[];
}

export interface CoordinatorWeekCapacityProps {
  weekLabel: string;
  days: CapacityDay[];
  onSelectSlot?: (slot: CapacitySlot) => void;
  onCreateShift?: (dayId?: string) => void;
  onPreviousWeek?: () => void;
  onNextWeek?: () => void;
  onToday?: () => void;
}

export interface AvailableVolunteerSlot {
  id: string;
  startsAt: string;
  endsAt: string;
  label: string;
  locationLabel?: string;
  focusTitle?: string;
  capacity: number;
  assignedCount: number;
}

export interface VolunteerAvailableSlotsProps {
  periodLabel: string;
  slots: AvailableVolunteerSlot[];
  claimingSlotId?: string;
  onClaimSlot?: (slot: AvailableVolunteerSlot) => void;
}

export interface VolunteerAssignment {
  id: string;
  startsAt: string;
  endsAt: string;
  title: string;
  locationLabel?: string;
  instructions?: string;
  status: "pending" | "assigned" | "confirmed" | "absence_requested";
  /** Coordinator-assigned roles for this specific prayer set. Empty array means no role designated yet. */
  roles?: ShiftRole[];
}

export interface VolunteerAssignmentsProps {
  assignments: VolunteerAssignment[];
  onRespondToInvitation?: (assignmentId: string, response: "accepted" | "declined") => void;
}
