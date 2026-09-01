import { useCallback, useEffect, useState } from 'react'
import {
  CoordinationOverview,
  InterestReviewQueue,
  type CoordinationOverviewData,
  type ServeInterestReviewItem,
} from '../coordinator'
import { CoordinatorWeekCapacity, type CapacityDay, type CapacitySlot } from '../scheduling'
import { getSupabaseBrowserClient } from '../../lib/supabase'

type InterestStatus = 'submitted' | 'reviewing' | 'approved' | 'declined'

interface InterestRow {
  id: string
  name: string
  email: string
  submitted_at: string
  availability: string[] | null
  desired_ways_to_serve: string[] | null
  notes: string | null
  status: InterestStatus
}

interface ShiftRow {
  id: string
  starts_at: string
  ends_at: string
  required_volunteers: number
  status: 'scheduled' | 'cancelled' | 'completed'
}

interface AssignmentRow {
  shift_id: string
  assignment_status: 'assigned' | 'confirmed' | 'cancelled' | 'declined'
}

interface CoordinatorState {
  interests: ServeInterestReviewItem[]
  overview: CoordinationOverviewData
  days: CapacityDay[]
  profiles: AdminProfileRow[]
}

interface AdminProfileRow {
  id: string
  display_name: string
  email: string
  role: 'prospect' | 'volunteer' | 'coordinator' | 'admin'
  status: 'invited' | 'active' | 'suspended' | 'archived'
}

type CoordinatorView = 'overview' | 'interests' | 'schedule' | 'people'

const emptyState: CoordinatorState = {
  interests: [],
  overview: {
    periodLabel: 'The coming seven days',
    upcomingGatherings: 0,
    openVolunteerSlots: 0,
    scheduledVolunteerSlots: 0,
    pendingInterests: 0,
    attentionItems: [],
  },
  days: [],
  profiles: [],
}

function reviewStatus(status: InterestStatus): ServeInterestReviewItem['status'] {
  if (status === 'reviewing') return 'in-conversation'
  if (status === 'approved') return 'invited'
  if (status === 'declined') return 'not-moving-forward'
  return 'new'
}

function dateKey(value: string) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Denver',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(value))
}

function startOfDay(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate())
}

function formatWeekLabel(start: Date, end: Date) {
  const formatter = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'America/Denver' })
  return `${formatter.format(start)}–${formatter.format(end)}`
}

function buildDays(shifts: ShiftRow[], assignments: AssignmentRow[]) {
  const assignedByShift = new Map<string, number>()
  assignments
    .filter((assignment) => assignment.assignment_status === 'assigned' || assignment.assignment_status === 'confirmed')
    .forEach((assignment) => assignedByShift.set(assignment.shift_id, (assignedByShift.get(assignment.shift_id) ?? 0) + 1))

  const now = startOfDay(new Date())
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(now)
    date.setDate(now.getDate() + index)
    const key = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Denver', year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(date)
    return {
      id: key,
      label: new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: 'America/Denver' }).format(date),
      dateLabel: new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'America/Denver' }).format(date),
      slots: [] as CapacitySlot[],
    }
  })

  const dayByKey = new Map(days.map((day) => [day.id, day]))
  shifts.forEach((shift) => {
    const day = dayByKey.get(dateKey(shift.starts_at))
    if (!day) return
    day.slots.push({
      id: shift.id,
      startsAt: shift.starts_at,
      endsAt: shift.ends_at,
      label: 'Prayer-room shift',
      capacity: shift.required_volunteers,
      assignedCount: assignedByShift.get(shift.id) ?? 0,
      status: shift.status,
    })
  })

  return days
}

interface CoordinatorWorkspaceProps {
  currentProfileId: string
  currentRole: 'coordinator' | 'admin'
  initialView?: CoordinatorView
}

function AdminPeopleManager({ currentProfileId, profiles, onPromote }: { currentProfileId: string; profiles: AdminProfileRow[]; onPromote: (profileId: string) => void }) {
  return (
    <section className="mx-auto max-w-6xl bg-white/45 p-6 sm:p-8" aria-labelledby="people-heading">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-altar-teal">Administrator workspace</p>
      <h2 className="mt-3 font-display text-3xl text-altar-ink" id="people-heading">People and access</h2>
      <p className="mt-3 max-w-3xl leading-7 text-altar-ink/75">Create or invite a person through Supabase first. Once their profile appears here, an active administrator can grant them administrator access. This never opens public sign-up.</p>
      <div className="mt-7 overflow-x-auto">
        <table className="min-w-full border-collapse text-left text-sm">
          <thead><tr className="border-b border-altar-sage/30 text-altar-sage"><th className="px-3 py-3 font-semibold">Person</th><th className="px-3 py-3 font-semibold">Current access</th><th className="px-3 py-3 font-semibold">Action</th></tr></thead>
          <tbody>
            {profiles.map((profile) => (
              <tr className="border-b border-altar-sage/20" key={profile.id}>
                <td className="px-3 py-4"><p className="font-semibold text-altar-ink">{profile.display_name || 'Invited person'}</p><p className="mt-1 text-altar-ink/70">{profile.email}</p></td>
                <td className="px-3 py-4 text-altar-ink/75">{profile.role} · {profile.status}</td>
                <td className="px-3 py-4">
                  {profile.id === currentProfileId ? <span className="text-altar-sage">Your account</span> : profile.role === 'admin' && profile.status === 'active' ? <span className="text-altar-sage">Administrator</span> : <button className="focus-ring rounded-sm border border-altar-teal px-3 py-2 font-semibold text-altar-teal hover:bg-altar-stone/40" onClick={() => onPromote(profile.id)} type="button">Make administrator</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

export function CoordinatorWorkspace({ currentProfileId, currentRole, initialView = 'overview' }: CoordinatorWorkspaceProps) {
  const [view, setView] = useState<CoordinatorView>(initialView)
  const [state, setState] = useState<CoordinatorState>(emptyState)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    const client = getSupabaseBrowserClient()
    const now = new Date()
    const end = new Date(now)
    end.setDate(end.getDate() + 7)

    const [{ data: interests, error: interestsError }, { data: shifts, error: shiftsError }, profilesResult] = await Promise.all([
      client
        .from('interest_submissions')
        .select('id, name, email, submitted_at, availability, desired_ways_to_serve, notes, status')
        .in('status', ['submitted', 'reviewing'])
        .order('submitted_at', { ascending: true }),
      client
        .from('shifts')
        .select('id, starts_at, ends_at, required_volunteers, status')
        .gte('starts_at', now.toISOString())
        .lt('starts_at', end.toISOString())
        .order('starts_at', { ascending: true }),
      currentRole === 'admin'
        ? client.from('profiles').select('id, display_name, email, role, status').order('email', { ascending: true })
        : Promise.resolve({ data: [] as AdminProfileRow[], error: null }),
    ])

    if (interestsError || shiftsError || profilesResult.error) {
      setError('Private workspace data could not be loaded. Please refresh and try again.')
      setIsLoading(false)
      return
    }

    const shiftRows = (shifts ?? []) as ShiftRow[]
    const shiftIds = shiftRows.map((shift) => shift.id)
    const { data: assignments, error: assignmentsError } = shiftIds.length === 0
      ? { data: [] as AssignmentRow[], error: null }
      : await client.from('shift_assignments').select('shift_id, assignment_status').in('shift_id', shiftIds)

    if (assignmentsError) {
      setError('Private schedule coverage could not be loaded. Please refresh and try again.')
      setIsLoading(false)
      return
    }

    const interestItems = ((interests ?? []) as InterestRow[]).map((interest) => ({
      id: interest.id,
      name: interest.name,
      email: interest.email,
      submittedAt: interest.submitted_at,
      availability: interest.availability ?? undefined,
      servingInterests: interest.desired_ways_to_serve ?? undefined,
      note: interest.notes,
      status: reviewStatus(interest.status),
    }))
    const assignmentRows = (assignments ?? []) as AssignmentRow[]
    const days = buildDays(shiftRows, assignmentRows)
    const scheduledVolunteerSlots = assignmentRows.filter((assignment) => (
      assignment.assignment_status === 'assigned' || assignment.assignment_status === 'confirmed'
    )).length
    const openVolunteerSlots = shiftRows.reduce((total, shift) => (
      total + Math.max(shift.required_volunteers - assignmentRows.filter((assignment) => (
        assignment.shift_id === shift.id && (assignment.assignment_status === 'assigned' || assignment.assignment_status === 'confirmed')
      )).length, 0)
    ), 0)

    setState({
      interests: interestItems,
      days,
      profiles: (profilesResult.data ?? []) as AdminProfileRow[],
      overview: {
        periodLabel: 'The coming seven days',
        upcomingGatherings: shiftRows.length,
        openVolunteerSlots,
        scheduledVolunteerSlots,
        pendingInterests: interestItems.length,
        attentionItems: openVolunteerSlots > 0 ? [{
          id: 'open-coverage',
          title: `${openVolunteerSlots} volunteer ${openVolunteerSlots === 1 ? 'place needs' : 'places need'} coverage`,
          description: 'Use the weekly coverage view to see where approved volunteers can be invited to serve.',
          severity: 'needs-attention' as const,
        }] : [],
      },
    })
    setIsLoading(false)
  }, [currentRole])

  useEffect(() => {
    const loadTimer = window.setTimeout(() => { void load() }, 0)
    return () => window.clearTimeout(loadTimer)
  }, [load])

  const review = async (interestId: string, status: 'reviewing' | 'approved' | 'declined') => {
    setError(null)
    const { error: reviewError } = await getSupabaseBrowserClient().rpc('review_interest_submission', {
      p_interest_id: interestId,
      p_status: status,
      p_decision_note: null,
    })
    if (reviewError) {
      setError('That review decision could not be saved. Please try again.')
      return
    }
    await load()
  }

  const promoteAdministrator = async (profileId: string) => {
    setError(null)
    const { error: promotionError } = await getSupabaseBrowserClient().from('profiles').update({ role: 'admin', status: 'active' }).eq('id', profileId)
    if (promotionError) {
      setError('Administrator access could not be updated. Please try again.')
      return
    }
    await load()
  }

  const weekStart = startOfDay(new Date())
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 6)

  return (
    <main className="min-h-full bg-altar-parchment text-altar-ink">
      <div className="mx-auto max-w-6xl px-6 pt-10 sm:px-10 lg:px-16">
        <div className="flex flex-col gap-4 border-b border-altar-sage/30 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-altar-teal">The Altar Initiative · Private workspace</p>
            <h1 className="mt-3 font-display text-4xl text-altar-teal">Coordinate the room</h1>
          </div>
          <nav aria-label="Coordinator workspace" className="flex flex-wrap gap-2">
            {(['overview', 'interests', 'schedule', ...(currentRole === 'admin' ? ['people'] as const : [])] as const).map((option) => (
              <button
                className={`focus-ring rounded-sm px-3 py-2 text-sm font-semibold ${view === option ? 'bg-altar-teal text-altar-parchment' : 'border border-altar-teal text-altar-teal'}`}
                key={option}
                onClick={() => setView(option)}
                type="button"
              >
                {option === 'overview' ? 'Overview' : option === 'interests' ? 'Serving interests' : option === 'schedule' ? 'Weekly coverage' : 'People & access'}
              </button>
            ))}
          </nav>
        </div>
        {error ? <p className="mt-5 border-l-2 border-altar-gold bg-white/50 p-4 text-sm text-altar-ink" role="alert">{error}</p> : null}
      </div>

      {view === 'overview' ? (
        <div className="mx-auto max-w-6xl"><CoordinationOverview data={state.overview} isLoading={isLoading} onOpenSchedule={() => setView('schedule')} onReviewInterests={() => setView('interests')} /></div>
      ) : null}
      {view === 'interests' ? (
        <div className="mx-auto max-w-6xl"><InterestReviewQueue items={state.interests} isLoading={isLoading} onOpenInterest={(id) => void review(id, 'reviewing')} onStartInvitation={(id) => void review(id, 'approved')} onMarkNotMovingForward={(id) => void review(id, 'declined')} /></div>
      ) : null}
      {view === 'schedule' ? <CoordinatorWeekCapacity days={state.days} weekLabel={formatWeekLabel(weekStart, weekEnd)} /> : null}
      {view === 'people' && currentRole === 'admin' ? <AdminPeopleManager currentProfileId={currentProfileId} onPromote={(id) => void promoteAdministrator(id)} profiles={state.profiles} /> : null}
    </main>
  )
}
