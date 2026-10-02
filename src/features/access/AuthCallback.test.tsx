import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { App } from '../../app/App'
import { hasAuthCallback } from './auth-callback-url'

const { getSession } = vi.hoisted(() => ({ getSession: vi.fn() }))
vi.mock('../../lib/supabase', async (original) => ({
  ...await original<typeof import('../../lib/supabase')>(),
  getSupabaseBrowserClient: () => ({ auth: {
    getSession,
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: vi.fn() } } }),
  } }),
}))
vi.mock('./PrivateAccessBoundary', () => ({
  PrivateAccessBoundary: () => <div>Authenticated private portal</div>,
}))

describe('email sign-in callbacks', () => {
  afterEach(() => { window.history.replaceState({}, '', '/'); vi.clearAllMocks() })

  it.each(['/', '/access', '/portal', '/coordinator'])('finishes a valid callback at %s', async (path) => {
    window.history.replaceState({}, '', `${path}#access_token=test&refresh_token=test`)
    getSession.mockResolvedValue({ data: { session: { user: { id: 'test-user' } } }, error: null })
    render(<MemoryRouter initialEntries={[path]}><App /></MemoryRouter>)
    await waitFor(() => expect(screen.getByText('Authenticated private portal')).toBeInTheDocument())
  })

  it('shows recovery instructions for a used link returned to the homepage', async () => {
    window.history.replaceState({}, '', '/#error=access_denied&error_code=otp_expired')
    getSession.mockResolvedValue({ data: { session: null }, error: null })
    render(<MemoryRouter><App /></MemoryRouter>)
    expect(await screen.findByRole('alert')).toHaveTextContent('already been used')
    expect(screen.getByRole('button', { name: 'Email me a sign-in link' })).toBeEnabled()
  })

  it('recovers from a session initialization failure', async () => {
    window.history.replaceState({}, '', '/#access_token=test')
    getSession.mockRejectedValue(new Error('Network unavailable'))
    render(<MemoryRouter><App /></MemoryRouter>)
    expect(await screen.findByRole('alert')).toHaveTextContent('Request a fresh link')
  })

  it('does not treat ordinary public fragments as login callbacks', () => {
    expect(hasAuthCallback(new URL('https://altarrhythm.com/rhythm#weekly-focus'))).toBe(false)
  })
})
