import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'
import { App } from './App'
import type { ActivePrivateProfile } from '../features/access'

vi.mock('../features/access', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../features/access')>()
  return {
    ...actual,
    PrivateAccessBoundary: ({ children, requireCoordinator }: { children: (profile: ActivePrivateProfile) => React.ReactNode; requireCoordinator?: boolean }) => {
      const mockProfile = (globalThis as unknown as { mockProfile?: ActivePrivateProfile }).mockProfile || {
        id: 'user-1',
        displayName: 'Test User',
        role: 'volunteer',
      }
      if (requireCoordinator && mockProfile.role === 'volunteer') {
        return <div>Access Denied</div>
      }
      return <div>{children(mockProfile)}</div>
    },
  }
})

describe('App', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-09-28T18:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
    delete (globalThis as unknown as { mockProfile?: ActivePrivateProfile }).mockProfile
  })

  it('presents the ALTAR Rhythm entry points and preserves private access', () => {
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: 'The ALTAR Rhythm' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Join the rhythm' })).toHaveAttribute('href', '#carry-the-rhythm')
    expect(screen.getByRole('region', { name: 'Carry the Rhythm Into Your Day' })).toHaveAttribute('id', 'carry-the-rhythm')
    expect(screen.getByRole('button', { name: 'Join live on Zoom' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Spotify playlist' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Apple Music playlist' })).toBeDisabled()
    expect(screen.getByRole('link', { name: 'THE ALTAR RHYTHM' })).toHaveAttribute('href', '/')
    expect(screen.getByRole('link', { name: 'Gathering times and locations' })).toHaveAttribute('href', '/initiatives')
    expect(screen.getByRole('link', { name: 'Explore the prayer focuses' })).toHaveAttribute('href', '/rhythm#weekly-focus')
    expect(screen.getByRole('link', { name: 'Explore the prayers' })).toHaveAttribute('href', '/rhythm#praying-the-scriptures')
    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/')
    expect(screen.getByRole('link', { name: 'Initiatives' })).toHaveAttribute('href', '/initiatives')
    expect(screen.getByRole('link', { name: 'Resources' })).toHaveAttribute('href', '/resources')
    expect(screen.getByRole('link', { name: 'Admin' })).toHaveAttribute('href', '/coordinator')
  })

  it('renders the public Initiatives and Resources routes', () => {
    const { unmount } = render(
      <MemoryRouter initialEntries={['/initiatives']}><App /></MemoryRouter>,
    )
    expect(screen.getByRole('heading', { name: 'ALTAR Initiatives' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Gathering times and locations' })).toHaveAttribute('href', '/calendar')
    unmount()

    render(<MemoryRouter initialEntries={['/resources']}><App /></MemoryRouter>)
    expect(screen.getByRole('heading', { name: 'Resources for the rhythm' })).toBeInTheDocument()
  })

  it('redirects admin users from /portal to /coordinator', () => {
    ;(globalThis as unknown as { mockProfile?: ActivePrivateProfile }).mockProfile = {
      id: 'admin-1',
      displayName: 'Admin User',
      role: 'admin',
    }

    render(
      <MemoryRouter initialEntries={['/portal']}>
        <App />
      </MemoryRouter>,
    )

    expect(screen.getByText('Overview')).toBeInTheDocument()
  })

  it('allows volunteer users to view volunteer schedule at /portal', () => {
    ;(globalThis as unknown as { mockProfile?: ActivePrivateProfile }).mockProfile = {
      id: 'vol-1',
      displayName: 'Volunteer User',
      role: 'volunteer',
    }

    render(
      <MemoryRouter initialEntries={['/portal']}>
        <App />
      </MemoryRouter>,
    )

    expect(screen.getByText('Your upcoming assignments')).toBeInTheDocument()
  })
})
