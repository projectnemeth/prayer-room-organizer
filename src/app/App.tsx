import { Route, Routes, useNavigate } from 'react-router-dom'
import { AppShell } from './AppShell'
import { PlaceholderPage } from './PlaceholderPage'
import {
  DailyRhythm,
  PublicCalendar,
  PublicHome,
  ServeInterestForm,
  UpdatesSignup,
} from '../features/public'

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
  return (
    <AppShell>
      <Routes>
        <Route index element={<PublicHomeRoute />} />
        <Route path="rhythm" element={<DailyRhythm />} />
        <Route path="calendar" element={<PublicCalendar />} />
        <Route path="serve" element={<ServeInterestForm />} />
        <Route path="updates" element={<UpdatesSignup />} />
        <Route path="*" element={<PlaceholderPage />} />
      </Routes>
    </AppShell>
  )
}
