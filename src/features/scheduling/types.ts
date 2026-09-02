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
  onCreateShift?: () => void;
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
  status: "assigned" | "confirmed" | "absence_requested";
}

export interface VolunteerAssignmentsProps {
  assignments: VolunteerAssignment[];
}
