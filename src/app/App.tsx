import { useCallback, useEffect, useState } from 'react'
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { AppShell } from './AppShell'
import { PlaceholderPage } from './PlaceholderPage'
import { appUrl } from './paths'
import {
  DailyRhythm,
  Initiatives,
  PublicCalendar,
  PublicHome,
  Resources,
  ServeInterestForm,
  type ServeInterestValues,
  UpdatesSignup,
  UpdateSubscriptionTokenPage,
} from '../features/public'
import { InvitationSignIn, PrivateAccessBoundary } from '../features/access'
import { AuthCallback } from '../features/access/AuthCallback'
import { hasAuthCallback } from '../features/access/auth-callback-url'
import { CoordinatorWorkspace, VolunteerSchedule } from '../features/private-workspace'
import {
  getSupabaseBrowserClient,
  hasSupabaseBrowserConfig,
  requestInvitationMagicLink,
  submitServeInterest,
  confirmUpdateSubscription,
  unsubscribeFromUpdates,
} from '../lib/supabase'

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
  const { state } = useLocation()
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
    }).catch(() => {
      if (mounted) setHasSession(false)
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

  return <InvitationSignIn onRequestMagicLink={requestMagicLink} initialError={state?.signInLinkFailed ? 'This sign-in link is invalid, expired, or has already been used. Request a fresh link below and open only the newest email.' : undefined} />
}

export function App() {
  const [isAuthCallback, setIsAuthCallback] = useState(() => hasAuthCallback(new URL(window.location.href)))
  const navigate = useNavigate()
  const finishAuthCallback = useCallback((signedIn: boolean) => {
    setIsAuthCallback(false)
    navigate(signedIn ? '/portal' : '/access', { replace: true, state: { signInLinkFailed: !signedIn } })
  }, [navigate])
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

  const confirmUpdates = async (token: string) => confirmUpdateSubscription(getSupabaseBrowserClient(), token)
  const unsubscribeUpdates = async (token: string) => unsubscribeFromUpdates(getSupabaseBrowserClient(), token)

  return (
    <AppShell>
      {isAuthCallback ? <AuthCallback onComplete={finishAuthCallback} /> : <Routes>
        <Route index element={<PublicHome />} />
        <Route path="rhythm" element={<DailyRhythm />} />
        <Route path="initiatives" element={<Initiatives />} />
        <Route path="resources" element={<Resources />} />
        <Route path="calendar" element={<PublicCalendar />} />
        <Route path="serve" element={<ServeInterestForm onSubmitInterest={submitInterest} />} />
        <Route path="updates" element={<UpdatesSignup />} />
        <Route path="updates/confirm" element={<UpdateSubscriptionTokenPage action={confirmUpdates} kind="confirm" />} />
        <Route path="updates/unsubscribe" element={<UpdateSubscriptionTokenPage action={unsubscribeUpdates} kind="unsubscribe" />} />
        <Route path="access" element={<AccessRoute />} />
        <Route path="portal/*" element={<VolunteerPortalRoute />} />
        <Route path="coordinator/*" element={<CoordinatorRoute />} />
        <Route path="*" element={<PlaceholderPage />} />
      </Routes>}
    </AppShell>
  )
}
