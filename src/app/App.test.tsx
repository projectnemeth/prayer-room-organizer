import { render, screen, within } from '@testing-library/react'
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
    expect(screen.getByRole('region', { name: 'Stay in the Rhythm' })).toHaveAttribute('id', 'carry-the-rhythm')
    expect(screen.getByRole('button', { name: 'Join live on Zoom' })).toBeDisabled()
    expect(screen.getByRole('link', { name: 'Spotify playlist' })).toHaveAttribute('href', expect.stringContaining('https://open.spotify.com/playlist/'))
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

  it('shows matching daily readings and uses the 31st for reflection', () => {
    vi.setSystemTime(new Date('2026-10-05T18:00:00Z'))
    const { unmount } = render(<MemoryRouter><App /></MemoryRouter>)
    const prayers = within(screen.getByRole('heading', { name: 'Pray with the words of Scripture' }).closest('article')!)
    expect(prayers.getByText('Psalms 21–22')).toBeInTheDocument()
    expect(prayers.getByText('Psalm 23 · Proverbs 5')).toBeInTheDocument()
    expect(prayers.getByText('Psalms 24–25')).toBeInTheDocument()
    unmount()

    vi.setSystemTime(new Date('2026-10-31T18:00:00Z'))
    const reflection = render(<MemoryRouter><App /></MemoryRouter>)
    expect(screen.getByText(/Day 31 is for catching up/)).toBeInTheDocument()
    expect(screen.getByTitle('Spotify worship playlist · Day 31')).toBeInTheDocument()
    expect(screen.queryByText(/Proverbs 31/)).not.toBeInTheDocument()
    reflection.unmount()

    vi.setSystemTime(new Date('2026-11-01T18:00:00Z'))
    render(<MemoryRouter><App /></MemoryRouter>)
    expect(screen.getByText('Psalm 3 · Proverbs 1')).toBeInTheDocument()
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
