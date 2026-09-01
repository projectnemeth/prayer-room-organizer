import { Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { AppShell } from './AppShell'
import { PlaceholderPage } from './PlaceholderPage'
import {
  DailyRhythm,
  PublicCalendar,
  PublicHome,
  ServeInterestForm,
  type ServeInterestValues,
  UpdatesSignup,
  type UpdatesSignupValues,
} from '../features/public'
import { InvitationSignIn, PrivateAccessBoundary } from '../features/access'
import { CoordinatorWorkspace, VolunteerSchedule } from '../features/private-workspace'
import {
  getSupabaseBrowserClient,
  requestInvitationMagicLink,
  submitServeInterest,
  subscribeToUpdates,
} from '../lib/supabase'

const publicPaths = {
  calendar: '/calendar',
  updates: '/updates',
  serve: '/serve',
  rhythm: '/rhythm',
} as const

function PublicHomeRoute() {
  const navigate = useNavigate()

  return <PublicHome onNavigate={(destination) => navigate(publicPaths[destination])} />
}

function VolunteerPortalRoute() {
  return (
    <PrivateAccessBoundary>
      {(profile) => <VolunteerSchedule volunteerName={profile.displayName} />}
    </PrivateAccessBoundary>
  )
}

function CoordinatorRoute() {
  const { pathname } = useLocation()
  const initialView = pathname.endsWith('/interests') ? 'interests'
    : pathname.endsWith('/schedule') ? 'schedule'
      : pathname.endsWith('/people') ? 'people'
        : 'overview'

  return (
    <PrivateAccessBoundary requireCoordinator>
      {(profile) => <CoordinatorWorkspace currentProfileId={profile.id} currentRole={profile.role === 'admin' ? 'admin' : 'coordinator'} initialView={initialView} key={`${profile.id}-${initialView}`} />}
    </PrivateAccessBoundary>
  )
}

function AccessRoute() {
  const requestMagicLink = async (email: string) => {
    await requestInvitationMagicLink(
      getSupabaseBrowserClient(),
      email,
      `${window.location.origin}/portal`,
    )
  }

  return <InvitationSignIn onRequestMagicLink={requestMagicLink} />
}

export function App() {
  const submitInterest = async (values: ServeInterestValues) => {
    await submitServeInterest(getSupabaseBrowserClient(), {
      name: values.name,
      email: values.email,
      phoneE164: values.phone,
      availability: values.availability,
      desiredWaysToServe: values.servingInterests,
      notes: values.note,
    })
  }

  const subscribe = async (values: UpdatesSignupValues) => {
    await subscribeToUpdates(getSupabaseBrowserClient(), { email: values.email })
  }

  return (
    <AppShell>
      <Routes>
        <Route index element={<PublicHomeRoute />} />
        <Route path="rhythm" element={<DailyRhythm />} />
        <Route path="calendar" element={<PublicCalendar />} />
        <Route path="serve" element={<ServeInterestForm onSubmitInterest={submitInterest} />} />
        <Route path="updates" element={<UpdatesSignup onSubscribe={subscribe} />} />
        <Route path="access" element={<AccessRoute />} />
        <Route path="portal/*" element={<VolunteerPortalRoute />} />
        <Route path="coordinator/*" element={<CoordinatorRoute />} />
        <Route path="*" element={<PlaceholderPage />} />
      </Routes>
    </AppShell>
  )
}
