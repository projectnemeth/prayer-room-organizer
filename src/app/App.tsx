import { useEffect, useState } from 'react'
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { AppShell } from './AppShell'
import { PlaceholderPage } from './PlaceholderPage'
import { appUrl } from './paths'
import {
  DailyRhythm,
  PublicCalendar,
  PublicHome,
  ServeInterestForm,
  type ServeInterestValues,
  UpdatesSignup,
  UpdateSubscriptionTokenPage,
  type UpdatesSignupValues,
} from '../features/public'
import { InvitationSignIn, PrivateAccessBoundary } from '../features/access'
import { CoordinatorWorkspace, VolunteerSchedule } from '../features/private-workspace'
import {
  getSupabaseBrowserClient,
  hasSupabaseBrowserConfig,
  requestInvitationMagicLink,
  submitServeInterest,
  subscribeToUpdates,
  confirmUpdateSubscription,
  unsubscribeFromUpdates,
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
      {(profile) =>
        profile.role === 'admin' || profile.role === 'coordinator' ? (
          <Navigate to="/coordinator" replace />
        ) : (
          <VolunteerSchedule volunteerName={profile.displayName} />
        )
      }
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
  const [hasSession, setHasSession] = useState(false)

  // Supabase uses the configured Site URL whenever a redirect target has not
  // been allow-listed. Keeping this callback handling here means a valid email
  // link that returns to /access still proceeds into the protected portal,
  // rather than presenting the sign-in form again.
  useEffect(() => {
    if (!hasSupabaseBrowserConfig(import.meta.env)) return

    const client = getSupabaseBrowserClient()
    let mounted = true

    void client.auth.getSession().then(({ data }) => {
      if (mounted && data.session) setHasSession(true)
    })

    const { data: { subscription } } = client.auth.onAuthStateChange((_event, session) => {
      if (mounted && session) setHasSession(true)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const requestMagicLink = async (email: string) => {
    await requestInvitationMagicLink(
      getSupabaseBrowserClient(),
      email,
      appUrl('/portal'),
    )
  }

  if (hasSession) return <Navigate to="/portal" replace />

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
    await subscribeToUpdates(getSupabaseBrowserClient(), { name: values.name, email: values.email, website: values.website })
  }
  const confirmUpdates = async (token: string) => confirmUpdateSubscription(getSupabaseBrowserClient(), token)
  const unsubscribeUpdates = async (token: string) => unsubscribeFromUpdates(getSupabaseBrowserClient(), token)

  return (
    <AppShell>
      <Routes>
        <Route index element={<PublicHomeRoute />} />
        <Route path="rhythm" element={<DailyRhythm />} />
        <Route path="calendar" element={<PublicCalendar />} />
        <Route path="serve" element={<ServeInterestForm onSubmitInterest={submitInterest} />} />
        <Route path="updates" element={<UpdatesSignup onSubscribe={subscribe} />} />
        <Route path="updates/confirm" element={<UpdateSubscriptionTokenPage action={confirmUpdates} kind="confirm" />} />
        <Route path="updates/unsubscribe" element={<UpdateSubscriptionTokenPage action={unsubscribeUpdates} kind="unsubscribe" />} />
        <Route path="access" element={<AccessRoute />} />
        <Route path="portal/*" element={<VolunteerPortalRoute />} />
        <Route path="coordinator/*" element={<CoordinatorRoute />} />
        <Route path="*" element={<PlaceholderPage />} />
      </Routes>
    </AppShell>
  )
}
