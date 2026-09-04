import { useCallback, useEffect, useState } from 'react'
import { VolunteerAssignments, VolunteerAvailableSlots, type AvailableVolunteerSlot, type ShiftRole, type ShiftRoleCoverage, type VolunteerAssignment } from '../scheduling'
import { getSupabaseBrowserClient } from '../../lib/supabase'

interface AssignmentRow { assignment_id: string; shift_id: string; starts_at: string; ends_at: string; title: string; location_label: string | null; assignment_status: 'pending' | 'assigned' | 'confirmed' | 'absence_requested'; roles: ShiftRole[] | null; role_instructions: Partial<Record<ShiftRole, string | null>> | null }
interface AvailableShiftRow { id: string; starts_at: string; ends_at: string; volunteer_count: number; role_coverage: ShiftRoleCoverage[] | null; title: string }
interface VolunteerScheduleProps { volunteerName: string }

export function VolunteerSchedule({ volunteerName }: VolunteerScheduleProps) {
  const [slots, setSlots] = useState<AvailableVolunteerSlot[]>([]); const [assignments, setAssignments] = useState<VolunteerAssignment[]>([]); const [claimingSlotId, setClaimingSlotId] = useState<string>(); const [error, setError] = useState<string | null>(null); const [message, setMessage] = useState<string | null>(null)
  const load = useCallback(async () => {
    const client = getSupabaseBrowserClient()
    const [{ data: available, error: availableError }, { data: assigned, error: assignedError }] = await Promise.all([client.rpc('list_available_volunteer_shifts', { p_limit: 50 }), client.rpc('list_my_shift_assignments', { p_limit: 50 })])
    if (availableError || assignedError) { setError('Your private schedule could not be loaded. Please refresh and try again.'); return }
    const heldShiftIds = new Set(((assigned ?? []) as AssignmentRow[]).map((assignment) => assignment.shift_id))
    setAssignments(((assigned ?? []) as AssignmentRow[]).map((assignment) => ({ id: assignment.assignment_id, startsAt: assignment.starts_at, endsAt: assignment.ends_at, title: assignment.title, locationLabel: assignment.location_label ?? undefined, status: assignment.assignment_status, roles: assignment.roles ?? [], roleInstructions: Object.fromEntries(Object.entries(assignment.role_instructions ?? {}).filter(([, instruction]) => Boolean(instruction))) as Partial<Record<ShiftRole, string>> })))
    setSlots(((available ?? []) as AvailableShiftRow[]).filter((shift) => !heldShiftIds.has(shift.id)).map((shift) => ({ id: shift.id, startsAt: shift.starts_at, endsAt: shift.ends_at, label: shift.title, volunteerCount: Number(shift.volunteer_count), roleCoverage: shift.role_coverage ?? [] })))
  }, [])
  useEffect(() => { const timer = window.setTimeout(() => { void load() }, 0); return () => window.clearTimeout(timer) }, [load])
  const claim = async (slot: AvailableVolunteerSlot) => { setClaimingSlotId(slot.id); setError(null); setMessage(null); const { error: claimError } = await getSupabaseBrowserClient().rpc('claim_open_shift', { p_shift_id: slot.id }); setClaimingSlotId(undefined); if (claimError) { setError(claimError.message || 'This shift could not be saved. Please refresh and try again.'); await load(); return }; setMessage(`You’re serving at ${slot.label}. A coordinator has been notified and will assign your function.`); await load() }
  const respond = async (assignmentId: string, response: 'accepted' | 'declined') => { setError(null); const { error: responseError } = await getSupabaseBrowserClient().rpc('respond_to_shift_invitation', { p_assignment_id: assignmentId, p_response: response }); if (responseError) { setError('That invitation could not be updated. Please refresh and try again.'); return }; await load() }
  return <>{error ? <p className="mx-auto mt-8 max-w-6xl border-l-2 border-altar-gold bg-white/50 p-4 text-sm text-altar-ink" role="alert">{error}</p> : null}{message ? <p className="mx-auto mt-8 max-w-6xl border-l-2 border-altar-teal bg-white/50 p-4 text-sm text-altar-ink" role="status">{message}</p> : null}<VolunteerAssignments assignments={assignments} onRespondToInvitation={(id, response) => void respond(id, response)} /><VolunteerAvailableSlots claimingSlotId={claimingSlotId} onClaimSlot={(slot) => void claim(slot)} periodLabel={`Welcome, ${volunteerName}`} slots={slots} /></>
}
