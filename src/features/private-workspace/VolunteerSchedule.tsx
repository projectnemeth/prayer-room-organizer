import { useCallback, useEffect, useState } from 'react'
import { VolunteerAvailableSlots, type AvailableVolunteerSlot } from '../scheduling'
import { getSupabaseBrowserClient } from '../../lib/supabase'

interface AvailableShiftRow {
  id: string
  starts_at: string
  ends_at: string
  required_volunteers: number
  assigned_count: number
  open_places: number
}

interface VolunteerScheduleProps {
  volunteerName: string
}

export function VolunteerSchedule({ volunteerName }: VolunteerScheduleProps) {
  const [slots, setSlots] = useState<AvailableVolunteerSlot[]>([])
  const [claimingSlotId, setClaimingSlotId] = useState<string>()
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    const { data, error: loadError } = await getSupabaseBrowserClient().rpc('list_available_volunteer_shifts', { p_limit: 50 })
    if (loadError) {
      setError('Available shifts could not be loaded. Please refresh and try again.')
      return
    }
    setSlots(((data ?? []) as AvailableShiftRow[]).map((shift) => ({
      id: shift.id,
      startsAt: shift.starts_at,
      endsAt: shift.ends_at,
      label: 'Prayer-room volunteer shift',
      capacity: shift.required_volunteers,
      assignedCount: shift.assigned_count,
    })))
  }, [])

  useEffect(() => {
    const loadTimer = window.setTimeout(() => { void load() }, 0)
    return () => window.clearTimeout(loadTimer)
  }, [load])

  const claim = async (slot: AvailableVolunteerSlot) => {
    setClaimingSlotId(slot.id)
    setError(null)
    const { error: claimError } = await getSupabaseBrowserClient().rpc('claim_open_shift', { p_shift_id: slot.id })
    setClaimingSlotId(undefined)
    if (claimError) {
      setError('This time is no longer available. Please choose another open shift.')
      await load()
      return
    }
    await load()
  }

  return (
    <>
      {error ? <p className="mx-auto mt-8 max-w-4xl border-l-2 border-altar-gold bg-white/50 p-4 text-sm text-altar-ink" role="alert">{error}</p> : null}
      <VolunteerAvailableSlots
        claimingSlotId={claimingSlotId}
        onClaimSlot={(slot) => void claim(slot)}
        periodLabel={`Welcome, ${volunteerName}. Here are the currently eligible opportunities.`}
        slots={slots}
      />
    </>
  )
}
