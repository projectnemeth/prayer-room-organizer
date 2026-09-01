import { Route, Routes, useNavigate } from 'react-router-dom'
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
import { PortalAccessDenied } from '../features/portal'
import {
  getSupabaseBrowserClient,
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
        <Route
          path="portal/*"
          element={<PortalAccessDenied requestAccessLink={{ href: '/serve', label: 'Share your interest' }} />}
        />
        <Route path="*" element={<PlaceholderPage />} />
      </Routes>
    </AppShell>
  )
}
