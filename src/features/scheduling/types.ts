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

export interface ShiftRoleRequirement {
  role: ShiftRole;
  required_count: number;
  volunteer_instructions: string | null;
}

/** Aggregate coverage only. It is safe to share in the volunteer portal. */
export interface ShiftRoleCoverage {
  role: ShiftRole;
  required_count: number;
  serving_count: number;
}

/** Coordinator-only identity data for a selected shift. */
export interface CoordinatorShiftAssignment {
  assignment_id: string;
  profile_id: string;
  display_name: string;
  email: string;
  assignment_status: "pending" | "assigned" | "confirmed" | "absence_requested";
  roles: ShiftRole[];
}

/**
 * Calendar cards use aggregate counts; identity data appears only after a
 * coordinator selects a shift to assign a role.
 */
export interface CapacitySlot {
  id: string;
  startsAt: string;
  endsAt: string;
  label: string;
  volunteerCount: number;
  /** Active claims with no coordinator-selected function yet. */
  unassignedClaimCount: number;
  pendingCount?: number;
  roleCoverage: ShiftRoleCoverage[];
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

export interface CoordinatorMonthCapacityProps {
  monthLabel: string;
  days: CapacityDay[];
  onSelectSlot?: (slot: CapacitySlot) => void;
  onCreateShift?: (dayId?: string) => void;
  onPreviousMonth?: () => void;
  onNextMonth?: () => void;
  onToday?: () => void;
}

export interface AvailableVolunteerSlot {
  id: string;
  startsAt: string;
  endsAt: string;
  label: string;
  focusTitle?: string;
  volunteerCount: number;
  roleCoverage: ShiftRoleCoverage[];
  /** The current volunteer already holds this shift. */
  isScheduled?: boolean;
}

export interface VolunteerAvailableSlotsProps {
  periodLabel: string;
  slots: AvailableVolunteerSlot[];
  claimingSlotId?: string;
  claimError?: { slotId: string; message: string } | null;
  onClaimSlot?: (slot: AvailableVolunteerSlot) => void;
}

export interface VolunteerAssignment {
  id: string;
  startsAt: string;
  endsAt: string;
  title: string;
  locationLabel?: string;
  status: "pending" | "assigned" | "confirmed" | "absence_requested";
  /** Coordinator-assigned roles for this specific prayer set. Empty array means no role designated yet. */
  roles?: ShiftRole[];
  /** Instructions are set by the coordinator for each role on this shift. */
  roleInstructions?: Partial<Record<ShiftRole, string>>;
}

export interface VolunteerAssignmentsProps {
  assignments: VolunteerAssignment[];
  onRespondToInvitation?: (assignmentId: string, response: "accepted" | "declined") => void;
}
