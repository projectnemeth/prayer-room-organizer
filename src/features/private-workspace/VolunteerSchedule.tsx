import { useCallback, useEffect, useState } from 'react'
import { VolunteerAssignments, VolunteerAvailableSlots, type AvailableVolunteerSlot, type ShiftRole, type VolunteerAssignment } from '../scheduling'
import { getSupabaseBrowserClient } from '../../lib/supabase'

interface AvailableShiftRow { id: string; starts_at: string; ends_at: string; required_volunteers: number; assigned_count: number; open_places: number; title: string; location_label: string | null; volunteer_instructions: string | null }
interface AssignmentRow { assignment_id: string; shift_id: string; starts_at: string; ends_at: string; title: string; location_label: string | null; volunteer_instructions: string | null; assignment_status: 'pending' | 'assigned' | 'confirmed' | 'absence_requested'; roles: ShiftRole[] | null }
interface VolunteerScheduleProps { volunteerName: string }

export function VolunteerSchedule({ volunteerName }: VolunteerScheduleProps) {
  const [slots, setSlots] = useState<AvailableVolunteerSlot[]>([]); const [assignments, setAssignments] = useState<VolunteerAssignment[]>([]); const [claimingSlotId, setClaimingSlotId] = useState<string>(); const [error, setError] = useState<string | null>(null)
  const load = useCallback(async () => {
    const client = getSupabaseBrowserClient()
    const [{ data: available, error: availableError }, { data: assigned, error: assignedError }] = await Promise.all([client.rpc('list_available_volunteer_shifts', { p_limit: 50 }), client.rpc('list_my_shift_assignments', { p_limit: 50 })])
    if (availableError || assignedError) { setError('Your private schedule could not be loaded. Please refresh and try again.'); return }
    const heldShiftIds = new Set(((assigned ?? []) as AssignmentRow[]).map((assignment) => assignment.shift_id))
    setAssignments(((assigned ?? []) as AssignmentRow[]).map((assignment) => ({ id: assignment.assignment_id, startsAt: assignment.starts_at, endsAt: assignment.ends_at, title: assignment.title, locationLabel: assignment.location_label ?? undefined, instructions: assignment.volunteer_instructions ?? undefined, status: assignment.assignment_status, roles: assignment.roles ?? [] })))
    setSlots(((available ?? []) as AvailableShiftRow[]).filter((shift) => !heldShiftIds.has(shift.id)).map((shift) => ({ id: shift.id, startsAt: shift.starts_at, endsAt: shift.ends_at, label: shift.title, locationLabel: shift.location_label ?? undefined, focusTitle: shift.volunteer_instructions ?? undefined, capacity: shift.required_volunteers, assignedCount: Number(shift.assigned_count) })))
  }, [])
  useEffect(() => { const timer = window.setTimeout(() => { void load() }, 0); return () => window.clearTimeout(timer) }, [load])
  const claim = async (slot: AvailableVolunteerSlot) => { setClaimingSlotId(slot.id); setError(null); const { error: claimError } = await getSupabaseBrowserClient().rpc('claim_open_shift', { p_shift_id: slot.id }); setClaimingSlotId(undefined); if (claimError) { setError('This time is no longer available. Please choose another open shift.'); await load(); return }; await load() }
  const respond = async (assignmentId: string, response: 'accepted' | 'declined') => { setError(null); const { error: responseError } = await getSupabaseBrowserClient().rpc('respond_to_shift_invitation', { p_assignment_id: assignmentId, p_response: response }); if (responseError) { setError('That invitation could not be updated. Please refresh and try again.'); return }; await load() }
  return <>{error ? <p className="mx-auto mt-8 max-w-4xl border-l-2 border-altar-gold bg-white/50 p-4 text-sm text-altar-ink" role="alert">{error}</p> : null}<VolunteerAssignments assignments={assignments} onRespondToInvitation={(id, response) => void respond(id, response)} /><VolunteerAvailableSlots claimingSlotId={claimingSlotId} onClaimSlot={(slot) => void claim(slot)} periodLabel={`Welcome, ${volunteerName}. Here are the currently eligible opportunities.`} slots={slots} /></>
}
